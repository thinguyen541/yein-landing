<script setup>
import { useSettings } from '../composables/useSettings'

// Opens Zalo when a number is configured in admin, otherwise scrolls to the contact section
const { zaloUrl } = useSettings()
</script>

<template>
  <a v-if="zaloUrl" :href="zaloUrl" target="_blank" rel="noopener"><slot>Nhắn Zalo</slot></a>
  <RouterLink v-else :to="{ path: '/', hash: '#lien-he' }"><slot>Nhắn Zalo</slot></RouterLink>
</template>
