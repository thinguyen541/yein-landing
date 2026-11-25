import { onFrame, prefersReducedMotion } from '../composables/smooth'

/**
 * v-parallax="0.1" on an <img> inside a container with overflow:hidden.
 * The image drifts against the scroll and is scaled just enough that its edges never show.
 */
export default {
  mounted(el, binding) {
    if (prefersReducedMotion()) return
    const speed = typeof binding.value === 'number' ? binding.value : 0.1
    const host = el.parentElement
    const scale = 1 + Math.abs(speed) * 2
    el.style.willChange = 'transform'
    el.__parallaxOff = onFrame(() => {
      const r = host.getBoundingClientRect()
      const vh = window.innerHeight
      if (r.bottom < -200 || r.top > vh + 200) return
      const offset = r.top + r.height / 2 - vh / 2
      const limit = r.height * Math.abs(speed) * 0.95
      const y = Math.max(-limit, Math.min(limit, -offset * speed))
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) scale(${scale})`
    })
  },
  unmounted(el) {
    el.__parallaxOff?.()
  },
}
