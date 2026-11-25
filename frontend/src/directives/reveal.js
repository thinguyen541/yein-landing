/**
 * v-reveal          -> fade / slide up when it enters the viewport
 * v-reveal="200"    -> same, 200 ms later
 * Add class "reveal-mask" for an image wipe (clipped open from the bottom).
 */
let io = null
const observer = () =>
  (io ||= new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return
        e.target.classList.add('is-in')
        io.unobserve(e.target)
      }),
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  ))

export default {
  mounted(el, binding) {
    el.classList.add('reveal')
    if (typeof binding.value === 'number') el.style.setProperty('--reveal-delay', `${binding.value}ms`)
    observer().observe(el)
  },
  unmounted(el) {
    io?.unobserve(el)
  },
}
