#!/usr/bin/env bash
# ============================================================
#  YEIN - deploy / update on an Ubuntu/Debian VPS
#  First time:  git clone <repo> && cd yein-landing && bash scripts/deploy-vps.sh
#  Update:      cd yein-landing && bash scripts/deploy-vps.sh
#  HTTPS:       bash scripts/deploy-vps.sh yein.vn   (point DNS A records @ and www to this VPS first)
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

[ "$(id -u)" -eq 0 ] || { echo "Run as root (or with sudo)"; exit 1; }
DOMAIN_ARG="${1:-}"

echo "==> 1/6 Swap"
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10 >/dev/null && echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
  echo "    created 2G swap"
else
  echo "    swap already on"
fi

echo "==> 2/6 Docker"
if ! command -v docker >/dev/null 2>&1; then
  apt-get update -y && apt-get install -y ca-certificates curl git openssl
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null 2>&1 || true
docker compose version

echo "==> 3/6 Source code"
if [ -d .git ]; then git pull --ff-only || echo "    (git pull skipped)"; fi

echo "==> 4/6 .env"
if [ ! -f .env ]; then
  ADMIN_PW=$(openssl rand -hex 6)
  cat > .env <<ENV
COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml
DB_NAME=yein
DB_USER=yein
DB_PASSWORD=$(openssl rand -hex 16)
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 48)
JWT_EXPIRES_IN=7d
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$ADMIN_PW
WEB_PORT=80
CORS_ORIGIN=*
ENV
  chmod 600 .env
  echo "    created .env (random passwords)"
else
  echo "    keeping existing .env"
fi

if [ -n "$DOMAIN_ARG" ]; then
  DOMAIN_ARG=$(echo "$DOMAIN_ARG" | sed -E 's#^https?://##; s#^www\.##; s#/.*$##')
  sed -i '/^DOMAIN=/d' .env
  echo "DOMAIN=$DOMAIN_ARG" >> .env
  sed -i 's#^COMPOSE_FILE=.*#COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml:docker-compose.ssl.yml#' .env
  echo "    HTTPS enabled for $DOMAIN_ARG (Caddy + Let's Encrypt)"
fi
DOMAIN=$(grep '^DOMAIN=' .env | cut -d= -f2 || true)

if [ -n "$DOMAIN" ]; then
  MYIP=$(curl -fsS https://api.ipify.org 2>/dev/null || true)
  for h in "$DOMAIN" "www.$DOMAIN"; do
    R=$(getent ahostsv4 "$h" | awk 'NR==1{print $1}' || true)
    if [ -z "$R" ]; then echo "    [!] $h chua tro DNS (chua co ban ghi A)";
    elif [ -n "$MYIP" ] && [ "$R" != "$MYIP" ]; then echo "    [!] $h dang tro ve $R, khong phai VPS nay ($MYIP)";
    else echo "    DNS ok: $h -> $R"; fi
  done
fi

echo "==> 5/6 Firewall"
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
  echo "    ufw: opened 22, 80, 443"
else
  echo "    ufw not active - skipped"
fi

echo "==> 6/6 Build & start"
# Switching to HTTPS: the old web container held port 80, recreate everything cleanly
docker compose up -d --build --remove-orphans
docker image prune -f >/dev/null

# Daily DB backup at 03:00
chmod +x scripts/backup-db.sh
CRON="0 3 * * * $(pwd)/scripts/backup-db.sh >> /var/log/yein-backup.log 2>&1"
( crontab -l 2>/dev/null | grep -v 'scripts/backup-db.sh' ; echo "$CRON" ) | crontab -

echo
echo "Waiting for the backend..."
sleep 15
docker compose ps
docker compose logs --tail 15 backend
IP=$(curl -fsS https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
echo
echo "============================================================"
if [ -n "$DOMAIN" ]; then BASE="https://$DOMAIN"; else BASE="http://$IP"; fi
echo " Website : $BASE"
echo " Admin   : $BASE/admin"
echo " Login   : $(grep '^ADMIN_USERNAME=' .env | cut -d= -f2) / $(grep '^ADMIN_PASSWORD=' .env | cut -d= -f2)"
echo " (change the admin password after the first login)"
echo "============================================================"
