import { createApp } from "vue";
import { createPinia } from "pinia";
import { router } from "@/app/router";

import App from "./App.vue";

// Vuetify 3
import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";
import { createVuetify } from "vuetify";

const vuetify = createVuetify({  
});

createApp(App)
  .use(createPinia())
  .use(router)
  .use(vuetify)
  .mount("#app");
