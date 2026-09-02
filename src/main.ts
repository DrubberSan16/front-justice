import { createApp } from "vue";
import { createPinia } from "pinia";
import { router } from "@/app/router";
import { appThemes, resolveInitialTheme } from "@/app/config/theme";
import { componentDefaults } from "@/app/config/component-defaults";
import { vReveal } from "@/app/motion";

import App from "./App.vue";
import "./style.css";

// Vuetify 3
import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";
import { VDataTable } from "vuetify/components";
import { createVuetify } from "vuetify";

const vuetify = createVuetify({
  components: { VDataTable },
  // Estándar de componentes de la plataforma. Ver component-defaults.ts: es el
  // punto único donde se decide el aspecto de cada componente, y Vuetify lo
  // propaga a todas las pantallas que lo usen.
  defaults: componentDefaults,
  theme: {
    defaultTheme: resolveInitialTheme(),
    themes: appThemes,
  },
});

createApp(App)
  .use(createPinia())
  .use(router)
  .use(vuetify)
  .directive("reveal", vReveal)
  .mount("#app");
