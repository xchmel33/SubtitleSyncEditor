import { createApp, reactive } from 'vue'
import './style.css'
import App from './App.vue'
import apiService from '@/utilities/client.js'
import vuetify from './plugins/vuetify'
import { PerfectScrollbarPlugin } from 'vue3-perfect-scrollbar';
import 'vue3-perfect-scrollbar/style.css';
import 'vuetify/dist/vuetify.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import './css/colors.scss'
import './css/common.scss'

const app = createApp(App)
const globalError = reactive({ message: '' })
const globalLoad = reactive({ message: '' })

// Use Vuetify instance here
app.use(vuetify)
app.use(PerfectScrollbarPlugin)

app.config.globalProperties.$apiService = apiService
app.config.globalProperties.$error = globalError
app.config.globalProperties.$loading = globalLoad

app.mount('#app')
