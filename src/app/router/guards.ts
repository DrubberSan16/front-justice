import type { Router } from "vue-router";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import {
  HOME_DASHBOARDS,
  canReadComponent,
  resolveAuthenticatedHomeRoute,
} from "@/app/utils/menu-permissions";
import {
  canAccessDigitalTwins,
  canAccessReporting,
} from "@/app/utils/role-access";

export function applyGuards(router: Router) {
  router.beforeEach(async (to) => {
    const auth = useAuthStore();
    const menu = useMenuStore();

    if (!auth.bootstrapped) auth.bootstrapFromStorage();

    const isPublic = to.meta.public === true;

    if (!auth.isAuthenticated) {
      if (isPublic) return;
      menu.clear();
      return { name: "login", query: { redirect: to.fullPath } };
    }

    // Con sesion, una pagina publica que no es el login (el adjunto de una OT)
    // no usa el menu: no se carga para ella ni puede fallar por el.
    if (isPublic && to.name !== "login") return;

    // Cargar el menu o resolver el tablero de inicio puede lanzar: por la red, por
    // el servidor o por un dato del menu que el front no espera (el 2026-09-25,
    // una seccion sin URL). Si la excepcion escapara, la navegacion se abortaria y
    // la pantalla quedaria en blanco, tambien al recargar, porque el token sigue
    // guardado. Se cierra esa sesion y se vuelve al login con un aviso que traduce
    // LoginView; ya sin sesion, este guard deja pasar al login sin tocar el menu.
    try {
      if (auth.userId) await menu.loadMenuTree(auth.userId);

      const homeRoute = resolveAuthenticatedHomeRoute(menu.tree);

      if (to.path === "/app" || to.fullPath === "/app") {
        return { name: homeRoute };
      }

      // Los cuatro tableros se gobiernan por el permiso de menu asignado al rol,
      // igual que cualquier otro modulo. El Super Administrador los atraviesa
      // todos porque `canReadComponent` le devuelve true, y asi puede revisarlos.
      if (
        typeof to.name === "string" &&
        (HOME_DASHBOARDS as readonly string[]).includes(to.name) &&
        !canReadComponent(menu.tree, to.name)
      ) {
        return { name: homeRoute };
      }

      if (to.name === "gemelos-digitales" && !canAccessDigitalTwins(auth.user)) {
        return { name: homeRoute };
      }

      if (to.meta.reportingRolesOnly === true && !canAccessReporting(auth.user)) {
        return { name: homeRoute };
      }

      if (to.name === "login") {
        return { name: homeRoute };
      }
    } catch (e) {
      console.error("[Router] No se pudo abrir el sistema con la sesión actual:", e);
      auth.logout();
      menu.clear();
      return {
        name: "login",
        query: {
          aviso: "sesion",
          redirect: to.name === "login" ? to.query.redirect : to.fullPath,
        },
      };
    }
  });
}
