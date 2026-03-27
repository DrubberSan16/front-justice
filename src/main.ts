import { createApp } from "vue";
import { createPinia } from "pinia";
import { router } from "@/app/router";
import { appThemes, resolveInitialTheme } from "@/app/config/theme";

import App from "./App.vue";
import "./style.css";

// Vuetify 3
import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";
import { VDataTable } from "vuetify/components";
import { createVuetify } from "vuetify";

const vuetify = createVuetify({
  components: { VDataTable },
  theme: {
    defaultTheme: resolveInitialTheme(),
    themes: appThemes,
  },
});

createApp(App)
  .use(createPinia())
  .use(router)
  .use(vuetify)
  .mount("#app");
