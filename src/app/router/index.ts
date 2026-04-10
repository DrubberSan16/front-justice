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
      meta: { public: true, layout: "auth", viewFile: "views/auth/LoginView.vue" },
      component: () => import("@/views/auth/LoginView.vue"),
    },
    {
      path: "/app",
      meta: { layout: "app" },
      children: [
        {
          path: "dashboard",
          name: "dashboard",
          meta: { title: "Dashboard", viewFile: "views/dashboard/DashboardView.vue" },
          component: () => import("@/views/dashboard/DashboardView.vue"),
        },
        {
          path: "usuarios",
          name: "usuarios",
          component: () => import("@/views/admin/UsersView.vue"),
          meta: { title: "Usuarios", viewFile: "views/admin/UsersView.vue" },
        },
        {
          path: "roles",
          name: "roles",
          component: () => import("@/views/admin/RolesView.vue"),
          meta: { title: "Roles", viewFile: "views/admin/RolesView.vue" },
        },
        {
          path: "menu",
          name: "menu",
          component: () => import("@/views/admin/MenusView.vue"),
          meta: { title: "Menu", viewFile: "views/admin/MenusView.vue" },
        },
        {
          path: "productos",
          name: "productos",
          component: () => import("@/views/admin/ProductsView.vue"),
          meta: { title: "Materiales", viewFile: "views/admin/ProductsView.vue" },
        },
        {
          path: "kardex",
          name: "kardex",
          component: () => import("@/views/admin/KardexView.vue"),
          meta: { title: "Kardex", viewFile: "views/admin/KardexView.vue" },
        },
        {
          path: "ordenes-compra",
          name: "ordenes-compra",
          component: () => import("@/views/admin/PurchaseOrdersView.vue"),
          meta: {
            title: "Ordenes de compra",
            viewFile: "views/admin/PurchaseOrdersView.vue",
          },
        },
        {
          path: "transferencias-bodega",
          name: "transferencias-bodega",
          component: () => import("@/views/admin/WarehouseTransfersView.vue"),
          meta: {
            title: "Transferencias de bodega",
            viewFile: "views/admin/WarehouseTransfersView.vue",
          },
        },
        {
          path: "sucursales",
          name: "sucursales",
          component: () => import("@/views/admin/InventoryCrudView.vue"),
          props: { moduleKey: "sucursales" },
          meta: { title: "Sucursales", viewFile: "views/admin/InventoryCrudView.vue" },
        },
        {
          path: "bodegas",
          name: "bodegas",
          component: () => import("@/views/admin/InventoryCrudView.vue"),
          props: { moduleKey: "bodegas" },
          meta: { title: "Bodegas", viewFile: "views/admin/InventoryCrudView.vue" },
        },
        {
          path: "lineas",
          name: "lineas",
          component: () => import("@/views/admin/InventoryCrudView.vue"),
          props: { moduleKey: "lineas" },
          meta: { title: "Lineas", viewFile: "views/admin/InventoryCrudView.vue" },
        },
        {
          path: "categorias",
          name: "categorias",
          component: () => import("@/views/admin/InventoryCrudView.vue"),
          props: { moduleKey: "categorias" },
          meta: { title: "Categorias", viewFile: "views/admin/InventoryCrudView.vue" },
        },
        {
          path: "marcas",
          name: "marcas",
          component: () => import("@/views/admin/InventoryCrudView.vue"),
          props: { moduleKey: "marcas" },
          meta: { title: "Marcas", viewFile: "views/admin/InventoryCrudView.vue" },
        },
        {
          path: "unidades-medida",
          name: "unidades-medida",
          component: () => import("@/views/admin/InventoryCrudView.vue"),
          props: { moduleKey: "unidades-medida" },
          meta: { title: "Unidades de medida", viewFile: "views/admin/InventoryCrudView.vue" },
        },
        {
          path: "stock-bodega",
          name: "stock-bodega",
          component: () => import("@/views/admin/InventoryCrudView.vue"),
          props: { moduleKey: "stock-bodega" },
          meta: { title: "Stock por bodega", viewFile: "views/admin/InventoryCrudView.vue" },
        },
        {
          path: "terceros",
          name: "terceros",
          component: () => import("@/views/admin/InventoryCrudView.vue"),
          props: { moduleKey: "terceros" },
          meta: { title: "Terceros", viewFile: "views/admin/InventoryCrudView.vue" },
        },
        {
          path: "equipos",
          name: "equipos",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "equipos" },
          meta: { title: "Equipos", viewFile: "views/admin/MaintenanceCrudView.vue" },
        },
        {
          path: "componentes-equipo",
          name: "componentes-equipo",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "componentes-equipo" },
          meta: { title: "Partes de equipos", viewFile: "views/admin/MaintenanceCrudView.vue" },
        },
        {
          path: "tipo-equipo",
          name: "tipo-equipo",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "tipo-equipo" },
          meta: { title: "Tipo de equipos", viewFile: "views/admin/MaintenanceCrudView.vue" },
        },
        {
          path: "locations",
          name: "locations",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "locations" },
          meta: { title: "Ubicaciones", viewFile: "views/admin/MaintenanceCrudView.vue" },
        },
        {
          path: "planes",
          name: "planes",
          component: () => import("@/views/admin/PlanesView.vue"),
          meta: { title: "Planes internos", viewFile: "views/admin/PlanesView.vue" },
        },
        {
          path: "programaciones",
          name: "programaciones",
          component: () => import("@/views/admin/ProgramacionesCalendarView.vue"),
          meta: { title: "Programaciones", viewFile: "views/admin/ProgramacionesCalendarView.vue" },
        },
        {
          path: "inteligencia-mantenimiento",
          name: "inteligencia-mantenimiento",
          component: () => import("@/views/admin/MaintenanceIntelligenceView.vue"),
          meta: { title: "Inteligencia Operativa", viewFile: "views/admin/MaintenanceIntelligenceView.vue" },
        },
        {
          path: "gemelos-digitales",
          name: "gemelos-digitales",
          component: () => import("@/views/admin/DigitalTwinsView.vue"),
          meta: { title: "Gemelos digitales", viewFile: "views/admin/DigitalTwinsView.vue" },
        },
        {
          path: "inteligencia/procedimientos",
          name: "inteligencia-procedimientos",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "inteligencia-procedimientos" },
          meta: { title: "Plantillas MPG", viewFile: "views/admin/MaintenanceCrudView.vue" },
        },
        {
          path: "inteligencia/analisis-lubricante",
          name: "inteligencia-analisis-lubricante",
          component: () => import("@/views/admin/LubricantAnalysisView.vue"),
          meta: { title: "Analisis de lubricante", viewFile: "views/admin/LubricantAnalysisView.vue" },
        },
        {
          path: "alertas",
          name: "alertas",
          component: () => import("@/views/admin/AlertsView.vue"),
          meta: { title: "Alertas", viewFile: "views/admin/AlertsView.vue" },
        },
        {
          path: "work-orders",
          name: "work-orders",
          component: () => import("@/views/admin/WorkOrdersView.vue"),
          meta: { title: "Work Orders", viewFile: "views/admin/WorkOrdersView.vue" },
        },
        {
          path: "bitacora",
          name: "bitacora",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "bitacora" },
          meta: { title: "Bitacora", viewFile: "views/admin/MaintenanceCrudView.vue" },
        },
        {
          path: "estados-equipo",
          name: "estados-equipo",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "estados-equipo" },
          meta: { title: "Estados de equipos", viewFile: "views/admin/MaintenanceCrudView.vue" },
        },
        {
          path: "eventos-equipo",
          name: "eventos-equipo",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "eventos-equipo" },
          meta: { title: "Eventos de equipos", viewFile: "views/admin/MaintenanceCrudView.vue" },
        },
        {
          path: "plan-tareas",
          name: "plan-tareas",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "plan-tareas" },
          meta: { title: "Tareas de planes", viewFile: "views/admin/MaintenanceCrudView.vue" },
        },
        {
          path: "work-order-tareas",
          name: "work-order-tareas",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "work-order-tareas" },
          meta: { title: "Tareas ejecutadas de OT", viewFile: "views/admin/MaintenanceCrudView.vue" },
        },
        {
          path: "work-order-adjuntos",
          name: "work-order-adjuntos",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "work-order-adjuntos" },
          meta: { title: "Adjuntos de OT", viewFile: "views/admin/MaintenanceCrudView.vue" },
        },
        {
          path: "work-order-consumos",
          name: "work-order-consumos",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "work-order-consumos" },
          meta: { title: "Consumos de OT", viewFile: "views/admin/MaintenanceCrudView.vue" },
        },
        {
          path: "work-order-issue-materials",
          name: "work-order-issue-materials",
          component: () => import("@/views/admin/MaintenanceCrudView.vue"),
          props: { moduleKey: "work-order-issue-materials" },
          meta: { title: "Salida de materiales OT", viewFile: "views/admin/MaintenanceCrudView.vue" },
        },
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
  const baseTitle = "Analisis KPI";
  document.title = to.meta?.title
    ? `${to.meta.title} | ${baseTitle}`
    : baseTitle;
});

applyGuards(router);
