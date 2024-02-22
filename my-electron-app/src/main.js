import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import apiService from './client.js'
import helpers from './helpers.js'
import vuetify from './plugins/vuetify'
import 'vuetify/dist/vuetify.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import './css/colors.scss'
import './css/common.scss'

const app = createApp(App)

// Use Vuetify instance here
app.use(vuetify)

app.config.globalProperties.$apiService = apiService
app.config.globalProperties.$helpers = helpers

app.mount('#app')
