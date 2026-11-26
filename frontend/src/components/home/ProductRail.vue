<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { thumb, imgFallback, onSale } from '../../utils'
import PriceTag from '../PriceTag.vue'

/**
 * Horizontal product rail with its OWN scroll (arrows, drag, swipe, trackpad).
 * The page keeps scrolling vertically over it – nothing is pinned.
 */
const props = defineProps({
  products: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  loaded: { type: Boolean, default: false },
})
const emit = defineEmits(['open'])

// ---- Tabs: Mẫu hot / Bán chạy / Hàng mới / Ưu đãi (labels set in admin) ----
const MAX = 16
const newest = (list) => [...list].sort((a, b) => b.id - a.id)
const tabs = computed(() => {
  const all = props.products
  const hot = all.filter((p) => p.is_hot)
  const best = all.filter((p) => p.is_featured)
  const fresh = all.filter((p) => p.is_new)
  const sale = all.filter((p) => onSale(p))
  const list = [
    { key: 'hot', label: 'Mẫu hot', items: hot },
    { key: 'best', label: 'Bán chạy', items: best.length ? best : all },
    // nothing flagged "Hàng mới" yet -> the most recently added models
    { key: 'new', label: 'Hàng mới', items: newest(fresh.length ? fresh : all) },
    { key: 'sale', label: 'Ưu đãi', items: sale },
  ]
  return list.filter((t) => t.items.length).map((t) => ({ ...t, items: t.items.slice(0, MAX) }))
})
const tab = ref('')
const current = computed(() => tabs.value.find((t) => t.key === tab.value) || tabs.value[0])
const shown = computed(() => current.value?.items || [])
function selectTab(key) {
  tab.value = key
  viewport.value?.scrollTo({ left: 0, behavior: 'smooth' })
}

// little labels on each card
const badgesOf = (p) => {
  const b = []
  if (p.is_hot) b.push({ cls: 'hot', text: 'Hot' })
  if (p.is_new) b.push({ cls: 'new', text: 'Mới' })
  if (p.is_featured) b.push({ cls: 'best', text: 'Bán chạy' })
  if (onSale(p)) b.push({ cls: 'sale', text: `-${Math.round((1 - p.sale_price / p.price) * 100)}%` })
  return b
}

const viewport = ref(null)
const progress = ref(0) // 0..1 scroll position
const canPrev = ref(false)
const canNext = ref(false)

function update() {
  const el = viewport.value
  if (!el) return
  const max = el.scrollWidth - el.clientWidth
  progress.value = max > 0 ? el.scrollLeft / max : 0
  canPrev.value = el.scrollLeft > 4
  canNext.value = el.scrollLeft < max - 4
}
function step(dir) {
  const el = viewport.value
  const card = el?.querySelector('.rcard')
  const w = card ? card.offsetWidth + 24 : 300
  el?.scrollBy({ left: dir * w * Math.max(1, Math.floor(el.clientWidth / w) - 1), behavior: 'smooth' })
}

// horizontal trackpad / shift+wheel scrolls the rail; vertical wheel keeps scrolling the page
function onWheel(e) {
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) e.stopPropagation()
}

// drag with the mouse (touch already swipes natively)
let dragX = null
let dragLeft = 0
let moved = false
function onDown(e) {
  if (e.pointerType !== 'mouse' || e.button !== 0) return
  dragX = e.clientX
  dragLeft = viewport.value.scrollLeft
  moved = false
}
function onMove(e) {
  if (dragX === null) return
  const dx = e.clientX - dragX
  if (Math.abs(dx) > 5) moved = true
  if (moved) viewport.value.scrollLeft = dragLeft - dx
}
function onUp() {
  dragX = null
}
// a drag must not open the product
function onClickCapture(e) {
  if (moved) {
    e.preventDefault()
    e.stopPropagation()
    moved = false
  }
}

watch(
  () => shown.value,
  async () => {
    await nextTick()
    update()
  }
)
onMounted(() => {
  update()
  window.addEventListener('resize', update)
})
onBeforeUnmount(() => window.removeEventListener('resize', update))
</script>

<template>
  <section id="san-pham" class="rail">
    <div class="rail__head">
      <div>
        <p class="eyebrow" v-reveal>Product catalogue</p>
        <h2 class="lux-display lux-display--sm" v-reveal="100">Mẫu kính nổi bật</h2>
        <div class="rail__tabs" role="tablist" v-reveal="150">
          <button
            v-for="t in tabs"
            :key="t.key"
            type="button"
            role="tab"
            :aria-selected="current?.key === t.key"
            :class="{ active: current?.key === t.key }"
            @click="selectTab(t.key)"
          >{{ t.label }}</button>
        </div>
      </div>
      <div class="rail__meta" v-reveal="200">
        <RouterLink class="rail__link" :to="{ name: 'products' }">Xem toàn bộ {{ total }} mẫu →</RouterLink>
        <span>Giá bán lẻ ngay dưới mỗi mẫu · bấm để xem chi tiết</span>
        <div class="rail__nav">
          <div class="rail__progress"><i :style="{ transform: `scaleX(${Math.max(0.08, progress)})` }"></i></div>
          <button type="button" class="rail__arrow" :disabled="!canPrev" aria-label="Mẫu trước" @click="step(-1)">←</button>
          <button type="button" class="rail__arrow" :disabled="!canNext" aria-label="Mẫu tiếp" @click="step(1)">→</button>
        </div>
      </div>
    </div>

    <div
      ref="viewport"
      class="rail__viewport"
      data-lenis-prevent-touch
      @scroll.passive="update"
      @wheel="onWheel"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointerleave="onUp"
      @click.capture="onClickCapture"
    >
      <div :key="current?.key" class="rail__track">
        <p v-if="!loaded" class="rail__empty">Đang tải sản phẩm…</p>
        <button
          v-for="(p, i) in shown"
          :key="p.id"
          type="button"
          class="rcard"
          :style="{ '--i': Math.min(i, 6) }"
          @click="emit('open', p)"
        >
          <div class="rcard__img">
            <span v-if="badgesOf(p).length" class="rcard__badges">
              <i v-for="b in badgesOf(p)" :key="b.cls" :class="b.cls">{{ b.text }}</i>
            </span>
            <img :src="thumb(p.image_url)" :alt="p.name" loading="lazy" draggable="false" @error="imgFallback($event, p.code)" />
          </div>
          <div class="rcard__info">
            <span class="rcard__idx">{{ String(i + 1).padStart(2, '0') }}</span>
            <strong>{{ p.code || p.name }}</strong>
            <em>{{ p.collection_name }}</em>
          </div>
          <div class="rcard__price"><PriceTag :product="p" /></div>
        </button>
        <div class="rail__end">
          <p>Kính không viền<br /><em>Chọn YEIN</em></p>
          <RouterLink class="rail__cta" :to="{ name: 'products' }">Xem toàn bộ sản phẩm <span>→</span></RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rail { position: relative; background: var(--paper); padding: clamp(64px, 7vw, 100px) 0; }
.rail__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; padding: 0 clamp(28px, 8vw, 140px); margin-bottom: 44px; }
.rail__tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 22px; }
.rail__tabs button { padding: 9px 18px; border-radius: 999px; border: 1px solid rgba(15, 48, 45, 0.22); background: transparent; color: var(--ink); font: inherit; font-size: 13px; letter-spacing: 0.04em; cursor: pointer; transition: background 0.3s, color 0.3s, border-color 0.3s; }
.rail__tabs button:hover { border-color: var(--green); }
.rail__tabs button.active { background: var(--green); border-color: var(--green); color: #fff; }
.rail__tabs button:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
.rail__track .rcard { animation: rcardIn 0.8s var(--ease-out) backwards; animation-delay: calc(var(--i) * 60ms); }
@keyframes rcardIn { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: none; } }
.rcard__img { position: relative; }
.rcard__badges { position: absolute; left: 12px; top: 12px; z-index: 1; display: flex; gap: 6px; }
.rcard__badges i { font-style: normal; font-size: 10.5px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 9px; border-radius: 999px; background: #fff; color: var(--green); box-shadow: 0 4px 14px -6px rgba(6, 35, 31, 0.35); }
.rcard__badges i.hot { background: #b3261e; color: #fff; }
.rcard__badges i.new { background: var(--green); color: #fff; }
.rcard__badges i.best { background: var(--gold); color: #fff; }
.rcard__badges i.sale { background: #fff; color: #b3261e; }
.rail__nav { display: flex; align-items: center; gap: 10px; }
.rail__arrow { width: 46px; height: 46px; border-radius: 50%; border: 1px solid rgba(15, 48, 45, 0.3); background: transparent; color: var(--green); font-size: 18px; cursor: pointer; transition: background 0.3s, color 0.3s, opacity 0.3s; }
.rail__arrow:hover:not(:disabled) { background: var(--green); color: #fff; }
.rail__arrow:disabled { opacity: 0.3; cursor: default; }
.rail__arrow:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
.rail__viewport { overflow-x: auto; overflow-y: hidden; scroll-snap-type: x proximity; scroll-padding-inline: clamp(28px, 8vw, 140px); scrollbar-width: none; cursor: grab; padding: 14px 0 20px; overscroll-behavior-x: contain; }
.rail__viewport::-webkit-scrollbar { display: none; }
.rail__viewport:active { cursor: grabbing; }
.rail__head .lux-display { margin: 0; }
.rail__meta { display: flex; flex-direction: column; align-items: flex-end; gap: 14px; font-size: 12px; letter-spacing: 0.08em; color: var(--muted); text-align: right; }
.rail__progress { width: 160px; margin-right: 8px; height: 1px; background: rgba(29, 36, 34, 0.12); overflow: hidden; }
.rail__progress i { display: block; height: 100%; background: var(--green); transform: scaleX(0); transform-origin: left; transition: transform 0.2s; }
.rail__link { font-size: 13px; letter-spacing: 0.06em; color: var(--green); text-decoration: underline; text-underline-offset: 4px; }
.rail__track { display: flex; gap: 24px; width: max-content; padding: 0 clamp(28px, 8vw, 140px); }
.rail__empty { width: 60vw; color: var(--muted); }
.rcard { width: clamp(240px, 21vw, 320px); flex: none; scroll-snap-align: start; user-select: none; background: none; border: 0; padding: 0; text-align: left; cursor: pointer; color: inherit; font: inherit; transition: transform 0.6s var(--ease-out); }
.rcard:hover { transform: translateY(-10px); }
.rcard:focus-visible { outline: 2px solid var(--gold); outline-offset: 6px; }
.rcard__img { aspect-ratio: 1; overflow: hidden; background: #fff; box-shadow: 0 30px 60px -40px rgba(15, 59, 53, 0.45); display: flex; align-items: center; justify-content: center; }
.rcard__img img { width: 100%; height: 100%; object-fit: contain; transition: transform 1s var(--ease-out); }
.rcard:hover .rcard__img img { transform: scale(1.06); }
.rcard__info { display: flex; align-items: baseline; gap: 12px; padding-top: 16px; }
.rcard__idx { font-size: 11px; color: var(--gold); }
.rcard__info strong { font-family: var(--serif); font-weight: 400; font-size: 22px; color: var(--ink); }
.rcard__info em { margin-left: auto; font-style: normal; font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 55%; }
.rcard__price { padding-top: 6px; }
.rail__end { flex: none; width: clamp(240px, 26vw, 380px); display: grid; place-items: center; align-content: center; gap: 28px; text-align: center; font-family: var(--serif); font-size: clamp(28px, 3vw, 44px); color: var(--green); }
.rail__end p { margin: 0; }
.rail__end em { color: var(--gold); }
.rail__cta { display: inline-flex; align-items: center; gap: 12px; padding: 16px 26px; border-radius: 999px; background: var(--green); color: #f3efe7; font-family: var(--sans); font-size: 13px; letter-spacing: 0.08em; transition: background 0.4s, transform 0.4s var(--ease-out); }
.rail__cta:hover { background: var(--green-deep); transform: translateY(-2px); }
.rail__cta span { transition: transform 0.4s var(--ease-out); }
.rail__cta:hover span { transform: translateX(4px); }

@media (max-width: 768px) {
  .rail__head { flex-direction: column; align-items: flex-start; padding: 0 24px; margin-bottom: 28px; }
  .rail__meta { align-items: flex-start; text-align: left; }
  .rail__track { padding: 0 24px; gap: 16px; }
  .rail__viewport { scroll-padding-inline: 24px; }
  .rcard { width: 70vw; }
  .rail__viewport { cursor: auto; }
}
</style>
