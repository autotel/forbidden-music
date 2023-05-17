import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import WorkletWorkbench from './WorkletWorkbench.vue'
import { createPinia } from 'pinia'

const pinia = createPinia();

createApp(WorkletWorkbench).use(pinia).mount('#app')
