import { useAuthStore } from "@/app/stores/auth.store";
import { useMenuStore } from "@/app/stores/menu.store";
export function applyGuards(router) {
    router.beforeEach(async (to) => {
        const auth = useAuthStore();
        const menu = useMenuStore();
        // Asegura bootstrap antes de navegar
        if (!auth.bootstrapped)
            auth.bootstrapFromStorage();
        const isPublic = to.meta.public === true;
        if (!isPublic) {
            // Protegidas: requiere sesión válida
            if (!auth.isAuthenticated) {
                menu.clear();
                return { name: "login", query: { redirect: to.fullPath } };
            }
            // Carga menú para ese usuario (dinámico)
            const uid = auth.userId;
            if (uid) {
                await menu.loadMenuTree(uid);
            }
        }
        // Si ya estás logueado y entras a login, manda a dashboard
        if (to.name === "login" && auth.isAuthenticated) {
            return { name: "dashboard" };
        }
    });
}
