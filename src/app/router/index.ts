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
          path: "kardex",
          name: "kardex",
          component: () => import("@/views/admin/KardexView.vue"),
          meta: { title: "Kardex" },
        },
        {
          path: "sucursales",
          name: "sucursales",
          component: () => import("@/views/admin/InventoryCrudView.vue"),
          props: { moduleKey: "sucursales" },
          meta: { title: "Sucursales" },
        },
        {
          path: "bodegas",
          name: "bodegas",
          component: () => import("@/views/admin/InventoryCrudView.vue"),
          props: { moduleKey: "bodegas" },
          meta: { title: "Bodegas" },
        },
        {
          path: "lineas",
          name: "lineas",
          component: () => import("@/views/admin/InventoryCrudView.vue"),
          props: { moduleKey: "lineas" },
          meta: { title: "Líneas" },
        },
        {
          path: "categorias",
          name: "categorias",
          component: () => import("@/views/admin/InventoryCrudView.vue"),
          props: { moduleKey: "categorias" },
          meta: { title: "Categorías" },
        },
        {
          path: "marcas",
          name: "marcas",
          component: () => import("@/views/admin/InventoryCrudView.vue"),
          props: { moduleKey: "marcas" },
          meta: { title: "Marcas" },
        },
        {
          path: "unidades-medida",
          name: "unidades-medida",
          component: () => import("@/views/admin/InventoryCrudView.vue"),
          props: { moduleKey: "unidades-medida" },
          meta: { title: "Unidades de medida" },
        },
        {
          path: "stock-bodega",
          name: "stock-bodega",
          component: () => import("@/views/admin/InventoryCrudView.vue"),
          props: { moduleKey: "stock-bodega" },
          meta: { title: "Stock por bodega" },
        },
        {
          path: "terceros",
          name: "terceros",
          component: () => import("@/views/admin/InventoryCrudView.vue"),
          props: { moduleKey: "terceros" },
          meta: { title: "Terceros" },
        },

        {
          path: "equipos",
          name: "equipos",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "equipos" },
          meta: { title: "Equipos" },
        },
        {
          path: "tipo-equipo",
          name: "tipo-equipo",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "tipo-equipo" },
          meta: { title: "Tipo de equipos" },
        },
        {
          path: "locations",
          name: "locations",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "locations" },
          meta: { title: "Ubicaciones" },
        },
        {
          path: "planes",
          name: "planes",
          component: () => import("@/views/admin/PlanesView.vue"),
          meta: { title: "Planes" },
        },
        {
          path: "programaciones",
          name: "programaciones",
          component: () => import("@/views/admin/ProgramacionesCalendarView.vue"),
          meta: { title: "Programaciones" },
        },
        {
          path: "alertas",
          name: "alertas",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "alertas" },
          meta: { title: "Alertas" },
        },
        {
          path: "work-orders",
          name: "work-orders",
          component: () => import("@/views/admin/WorkOrdersView.vue"),
          meta: { title: "Work Orders" },
        },
        {
          path: "bitacora",
          name: "bitacora",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "bitacora" },
          meta: { title: "Bitácora" },
        },
        {
          path: "estados-equipo",
          name: "estados-equipo",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "estados-equipo" },
          meta: { title: "Estados de equipos" },
        },
        {
          path: "eventos-equipo",
          name: "eventos-equipo",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "eventos-equipo" },
          meta: { title: "Eventos de equipos" },
        },
        {
          path: "plan-tareas",
          name: "plan-tareas",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "plan-tareas" },
          meta: { title: "Tareas de planes" },
        },
        {
          path: "work-order-tareas",
          name: "work-order-tareas",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "work-order-tareas" },
          meta: { title: "Tareas ejecutadas de OT" },
        },
        {
          path: "work-order-adjuntos",
          name: "work-order-adjuntos",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "work-order-adjuntos" },
          meta: { title: "Adjuntos de OT" },
        },
        {
          path: "work-order-consumos",
          name: "work-order-consumos",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "work-order-consumos" },
          meta: { title: "Consumos de OT" },
        },
        {
          path: "work-order-issue-materials",
          name: "work-order-issue-materials",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "work-order-issue-materials" },
          meta: { title: "Salida de materiales OT" },
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
