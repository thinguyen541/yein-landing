FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV RESOURCE_DIR=/app/resources

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY src ./src
COPY scripts ./scripts
# Owned by "node" so the named volume mounted here is writable
RUN mkdir -p /app/resources && chown -R node:node /app/resources

USER node
EXPOSE 4000
CMD ["node", "src/index.js"]
