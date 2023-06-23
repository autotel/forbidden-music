import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import WorkletWorkbench from './WorkletWorkbench.vue'
import { createPinia } from 'pinia'

if (window.location.hash.match("workbench")) {
    createApp(WorkletWorkbench).mount('#app')
} else {
    const pinia = createPinia();
    createApp(App).use(pinia).mount('#app')
}

