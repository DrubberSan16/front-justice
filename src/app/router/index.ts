import { createRouter, createWebHistory } from "vue-router";
import { applyGuards } from "@/app/router/guards";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: { name: "login" },
    },
    {
      path: "/login",
      name: "login",
      meta: { public: true, layout: "auth" },
      component: () => import("@/views/auth/LoginView.vue"),
    },
    {
      path: "/app",
      meta: { layout: "app" },
      children: [
        {
          path: "dashboard",
          name: "dashboard",
          component: () => import("@/views/dashboard/DashboardView.vue"),
        },
        {
          path: "usuarios",
          name: "usuarios",
          component: () => import("@/views/admin/UsersView.vue"),
          meta: { title: "Usuarios" },
        },
        {
          path: "roles",
          name: "roles",
          component: () => import("@/views/admin/RolesView.vue"),
          meta: { title: "Roles" },
        },

        // Ejemplos (puedes crear estas vistas luego):
        // { path: "usuarios", name: "usuarios", component: () => import("@/views/admin/UsuariosView.vue") },
        // { path: "menu", name: "menu", component: () => import("@/views/admin/MenuView.vue") },
        // { path: "rol", name: "rol", component: () => import("@/views/admin/RolView.vue") },
      ],
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: { name: "login" },
    },
  ],
});

router.afterEach((to) => {
  const baseTitle = "Análisis KPI";
  document.title = to.meta?.title
    ? `${to.meta.title} | ${baseTitle}`
    : baseTitle;
});

applyGuards(router);
