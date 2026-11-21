<script setup>
import SiteHeader from '../components/SiteHeader.vue'
import SiteFooter from '../components/SiteFooter.vue'
import ZaloLink from '../components/ZaloLink.vue'
</script>

<template>
  <SiteHeader />
  <main>
    <RouterView />
  </main>
  <SiteFooter />
  <ZaloLink class="zalo-float">Zalo</ZaloLink>
</template>
