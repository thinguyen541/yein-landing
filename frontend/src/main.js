import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import reveal from './directives/reveal'
import parallax from './directives/parallax'
import './styles/main.css'

createApp(App).use(router).directive('reveal', reveal).directive('parallax', parallax).mount('#app')
