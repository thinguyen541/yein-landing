import Lenis from 'lenis'

/**
 * Smooth scroll (Lenis) + one shared requestAnimationFrame loop for the public site.
 * Every scroll-driven effect (hero zoom, parallax, product rail, process cards…) subscribes
 * with onFrame() so they all follow the same smoothed scroll value.
 */
let lenis = null
let rafId = 0
let lastY = -1
let dirty = true
const subs = new Set()

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const markDirty = () => (dirty = true)

export function initSmooth() {
  if (rafId) return lenis
  if (!prefersReducedMotion()) {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 0.9,
      touchMultiplier: 1.3,
    })
  }
  window.addEventListener('resize', markDirty)
  const loop = (time) => {
    lenis?.raf(time)
    const y = lenis ? lenis.scroll : window.scrollY
    if (y !== lastY || dirty) {
      lastY = y
      dirty = false
      subs.forEach((fn) => fn(y))
    }
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)
  return lenis
}

export function destroySmooth() {
  cancelAnimationFrame(rafId)
  rafId = 0
  window.removeEventListener('resize', markDirty)
  lenis?.destroy()
  lenis = null
}

/** Subscribe to the (smoothed) scroll position. Returns an unsubscribe function. */
export function onFrame(fn) {
  subs.add(fn)
  dirty = true
  return () => subs.delete(fn)
}

/** Re-run all subscribers on the next frame (after layout changes). */
export function refresh() {
  dirty = true
  lenis?.resize()
}

export function scrollTo(target, opts = {}) {
  const offset = opts.offset ?? -80
  if (lenis) {
    // the page may have just changed (or grown after data loaded): re-measure first,
    // otherwise Lenis clamps the target to the old, shorter page and stays near the top
    lenis.resize()
    return lenis.scrollTo(target, { duration: 1.5, offset, force: true, ...opts })
  }
  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (typeof target === 'number') window.scrollTo({ top: target, behavior: 'smooth' })
  else el?.scrollIntoView({ behavior: 'smooth' })
}

/** Pause smooth scrolling while a modal is open (the modal scrolls by itself). */
export const stopSmooth = () => lenis?.stop()
export const startSmooth = () => lenis?.start()
export const getLenis = () => lenis
