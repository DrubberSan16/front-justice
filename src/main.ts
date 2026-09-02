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
import { es } from "vuetify/locale";

const vuetify = createVuetify({
  components: { VDataTable },
  // Estándar de componentes de la plataforma. Ver component-defaults.ts: es el
  // punto único donde se decide el aspecto de cada componente, y Vuetify lo
  // propaga a todas las pantallas que lo usen.
  defaults: componentDefaults,
  // Los textos propios de Vuetify venian en ingles en toda la plataforma:
  // paginacion de tablas ("Items per page", "Next page"), estados vacios y
  // etiquetas de accesibilidad. Con el locale es quedan traducidos de una vez
  // en todas las pantallas.
  locale: { locale: "es", fallback: "en", messages: { es } },
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
