import type { Router } from "vue-router";
import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
import { canReadComponent, resolveAuthenticatedHomeRoute } from "@/app/utils/menu-permissions";
import { canAccessDigitalTwins } from "@/app/utils/role-access";

export function applyGuards(router: Router) {
  router.beforeEach(async (to) => {
    const auth = useAuthStore();
    const menu = useMenuStore();

    if (!auth.bootstrapped) auth.bootstrapFromStorage();

    const isPublic = to.meta.public === true;

    if (!isPublic) {
      if (!auth.isAuthenticated) {
        menu.clear();
        return { name: "login", query: { redirect: to.fullPath } };
      }

      const uid = auth.userId;
      if (uid) {
        await menu.loadMenuTree(uid);
      }
    }

    if (
      auth.isAuthenticated &&
      auth.userId &&
      (!menu.tree.length || menu.loadedForUserId !== auth.userId)
    ) {
      await menu.loadMenuTree(auth.userId);
    }

    const homeRoute = resolveAuthenticatedHomeRoute(menu.tree);

    if (auth.isAuthenticated && (to.path === "/app" || to.fullPath === "/app")) {
      return { name: homeRoute };
    }

    if (auth.isAuthenticated && to.name === "dashboard" && !canReadComponent(menu.tree, "dashboard")) {
      return { name: "bienvenida" };
    }

    if (auth.isAuthenticated && to.name === "gemelos-digitales" && !canAccessDigitalTwins(auth.user)) {
      return { name: homeRoute };
    }

    if (to.name === "login" && auth.isAuthenticated) {
      return { name: homeRoute };
    }
  });
}
