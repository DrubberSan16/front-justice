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
        {
          path: "menu",
          name: "menu",
          component: () => import("@/views/admin/MenusView.vue"),
          meta: { title: "Menú" },
        },

        {
          path: "productos",
          name: "productos",
          component: () => import("@/views/admin/ProductsView.vue"),
          meta: { title: "Productos" },
        },

        {
          path: "sucursales",
          name: "sucursales",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "sucursales" },
          meta: { title: "Sucursales" },
        },
        {
          path: "bodegas",
          name: "bodegas",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "bodegas" },
          meta: { title: "Bodegas" },
        },
        {
          path: "lineas",
          name: "lineas",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "lineas" },
          meta: { title: "Líneas" },
        },
        {
          path: "categorias",
          name: "categorias",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "categorias" },
          meta: { title: "Categorías" },
        },
        {
          path: "marcas",
          name: "marcas",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "marcas" },
          meta: { title: "Marcas" },
        },
        {
          path: "unidades-medida",
          name: "unidades-medida",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "unidades-medida" },
          meta: { title: "Unidades de medida" },
        },
        {
          path: "stock-bodega",
          name: "stock-bodega",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "stock-bodega" },
          meta: { title: "Stock por bodega" },
        },
        {
          path: "terceros",
          name: "terceros",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "terceros" },
          meta: { title: "Terceros" },
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
