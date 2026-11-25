<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import ZaloLink from './ZaloLink.vue'

const props = defineProps({
  slides: { type: Array, required: true },
  interval: { type: Number, default: 6000 },
})

const count = computed(() => props.slides.length)
// Infinite loop: the track is [clone of last, ...slides, clone of first].
// pos = position on the track (1..count are the real slides); after sliding onto a clone we jump
// (without animation) to the matching real slide, so it always keeps sliding in the same direction.
const loop = computed(() => count.value > 1)
const track = computed(() =>
  loop.value
    ? [{ ...props.slides[count.value - 1], _clone: 'last' }, ...props.slides, { ...props.slides[0], _clone: 'first' }]
    : props.slides
)
const pos = ref(loop.value ? 1 : 0)
const index = computed(() => (loop.value ? (pos.value - 1 + count.value) % count.value : pos.value)) // real slide
const snapping = ref(false) // true while jumping from a clone to the real slide (no transition)
const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// ---- autoplay with pause/resume that keeps the elapsed time ----
// Reasons to hold the slider: 'hover' (real mouse only), 'focus' (keyboard focus), 'hidden' (tab hidden), 'drag'
const holds = reactive(new Set())
const paused = computed(() => holds.size > 0)
const slideKey = ref(0) // changes only when the slide changes -> restarts the progress bar
let timer = null
let remaining = props.interval
let startedAt = 0

function start() {
  clearTimeout(timer)
  timer = null
  if (reduceMotion || paused.value || count.value < 2) return
  startedAt = performance.now()
  timer = setTimeout(() => go(index.value + 1), remaining)
}
function stop() {
  if (!timer) return
  clearTimeout(timer)
  timer = null
  remaining = Math.max(0, remaining - (performance.now() - startedAt))
}
function hold(reason, on) {
  if (on === holds.has(reason)) return
  on ? holds.add(reason) : holds.delete(reason)
  paused.value ? stop() : start()
}

const onClone = () => pos.value === 0 || pos.value === count.value + 1
let snapTimer = null

function moveTo(p, isStep) {
  if (!loop.value) return
  // still sliding onto a clone: ignore extra next/prev clicks (it snaps in a moment)
  if (isStep && onClone()) return
  pos.value = Math.max(0, Math.min(count.value + 1, p))
  remaining = props.interval
  slideKey.value++
  start()
  clearTimeout(snapTimer)
  if (onClone()) {
    if (reduceMotion) snapNow()
    else snapTimer = setTimeout(() => onClone() && snapNow(), 1200) // fallback if transitionend is missed
  }
}
const go = (i) => moveTo(i + 1) // dots: real slide i
const next = () => moveTo(pos.value + 1, true)
const prev = () => moveTo(pos.value - 1, true)

function snapNow() {
  snapping.value = true
  pos.value = pos.value === 0 ? count.value : 1
  requestAnimationFrame(() => requestAnimationFrame(() => (snapping.value = false)))
}
// A clone and its real twin are "active" together, so their caption / zoom animations stay in sync
// and the jump from the clone to the real slide is invisible.
const isActive = (k) => k === pos.value || (pos.value === count.value + 1 && k === 1) || (pos.value === 0 && k === count.value)

function onTransitionEnd(e) {
  if (e.target !== e.currentTarget || e.propertyName !== 'transform') return
  if (onClone()) snapNow()
}

// Pause only while a real mouse is over a control (arrows, dots, buttons) – not over the photo/text.
// (touch screens fire fake hover events, so only pointerType 'mouse' counts)
const CONTROLS = '.hs-arrow, .hs-dots button, .hs-actions a, .hs-actions button'
const onOver = (e) => hold('hover', e.pointerType === 'mouse' && !!e.target.closest?.(CONTROLS))
const onLeave = () => hold('hover', false)
// focus pause only for keyboard users; clicking an arrow/dot must not stop the slider
const onFocusIn = (e) => hold('focus', !!e.target.matches?.(':focus-visible'))
const onFocusOut = (e) => {
  if (!e.currentTarget.contains(e.relatedTarget)) hold('focus', false)
}
const onVisibility = () => hold('hidden', document.hidden)

// ---- swipe / drag ----
const drag = ref(0) // px offset while dragging
const dragging = ref(false)
let startX = null
let startY = null
let width = 1
const viewport = ref(null)
function onDown(e) {
  if (e.button !== undefined && e.button !== 0) return
  if (e.target.closest('a, button')) return
  startX = e.clientX
  startY = e.clientY
  width = viewport.value?.clientWidth || 1
}
function onMove(e) {
  if (startX === null) return
  const dx = e.clientX - startX
  if (!dragging.value) {
    if (Math.abs(dx) < 8 || Math.abs(e.clientY - startY) > Math.abs(dx)) return // tap or vertical scroll
    dragging.value = true
    hold('drag', true)
  }
  drag.value = dx
}
function onUp() {
  if (startX === null) return
  const dx = drag.value
  const wasDragging = dragging.value
  startX = null
  drag.value = 0
  dragging.value = false
  if (wasDragging && Math.abs(dx) > Math.min(80, width * 0.12)) {
    holds.delete('drag')
    dx < 0 ? next() : prev()
  } else hold('drag', false) // a simple tap resumes where it was
}

function onKey(e) {
  if (e.key === 'ArrowRight') next()
  else if (e.key === 'ArrowLeft') prev()
}

const trackStyle = computed(() => ({
  transform: `translate3d(calc(${-pos.value * 100}% + ${drag.value}px), 0, 0)`,
  transition: dragging.value || snapping.value ? 'none' : undefined,
}))

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  start()
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  clearTimeout(snapTimer)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <section
    class="hs"
    aria-roledescription="carousel"
    aria-label="Banner YEIN"
    tabindex="0"
    @pointerover="onOver"
    @pointerleave="onLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
    @keydown="onKey"
  >
    <div
      ref="viewport"
      class="hs-viewport"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @pointerleave="onUp"
    >
      <div class="hs-track" :class="{ snapping }" :style="trackStyle" @transitionend="onTransitionEnd">
        <article
          v-for="(s, k) in track"
          :key="(s._clone || 'real') + s.img"
          class="hs-slide"
          :class="[`side-${s.side || 'left'}`, `tone-${s.tone || 'dark'}`, { active: isActive(k) }]"
          :aria-hidden="k !== pos || !!s._clone"
          aria-roledescription="slide"
          :aria-label="s._clone ? undefined : `${(loop ? k : k + 1)} / ${slides.length}`"
        >
          <div class="hs-media">
            <img
              :src="s.img"
              :alt="s.alt"
              :style="{ objectPosition: `${s.focus || '50%'} center` }"
              loading="eager"
              :fetchpriority="k === 1 ? 'high' : 'auto'"
              draggable="false"
            />
          </div>
          <div class="hs-caption">
            <div class="hs-caption-inner">
              <p class="eyebrow">{{ s.eyebrow }}</p>
              <!-- titles come from our own data file (src/data/banners.js) -->
              <h2 v-html="s.title" />
              <p class="hs-text">{{ s.text }}</p>
              <div class="hs-actions">
                <ZaloLink v-if="s.cta?.zalo" class="btn" :class="s.tone === 'light' ? 'btn-light' : 'btn-dark'" :tabindex="k === pos && !s._clone ? 0 : -1">{{ s.cta.label }}</ZaloLink>
                <RouterLink v-else-if="s.cta" :to="s.cta.to" class="btn" :class="s.tone === 'light' ? 'btn-light' : 'btn-dark'" :tabindex="k === pos && !s._clone ? 0 : -1">
                  {{ s.cta.label }} <span aria-hidden="true">→</span>
                </RouterLink>
              </div>
            </div>
          </div>
        </article>
      </div>

      <template v-if="slides.length > 1">
        <button class="hs-arrow prev" type="button" aria-label="Ảnh trước" @click="prev">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.6" /></svg>
        </button>
        <button class="hs-arrow next" type="button" aria-label="Ảnh tiếp" @click="next">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.6" /></svg>
        </button>
      </template>
    </div>

    <div v-if="slides.length > 1" class="hs-dots" :class="{ paused }">
      <button
        v-for="(s, i) in slides"
        :key="s.img"
        type="button"
        :class="{ active: i === index }"
        :aria-label="`Xem ảnh ${i + 1}`"
        :aria-current="i === index"
        @click="go(i)"
      >
        <span :key="i === index ? slideKey : 'idle'" :style="{ animationDuration: interval + 'ms' }" />
      </button>
    </div>
  </section>
</template>
