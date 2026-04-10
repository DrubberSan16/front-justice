import { defineStore } from "pinia";
import { api } from "@/app/http/api";
export const useMenuRolesStore = defineStore("menuRoles", {
    state: () => ({
        drafts: {},
        original: {},
    }),
    actions: {
        reset() {
            this.drafts = {};
            this.original = {};
        },
        getDraft(menuId) {
            if (!this.drafts[menuId]) {
                this.drafts[menuId] = {
                    menuId,
                    enabled: false,
                    isReaded: false,
                    isCreated: false,
                    isEdited: false,
                    permitDeleted: false,
                    isReports: false,
                    reportsPermit: "{}",
                    status: "ACTIVE",
                };
            }
            return this.drafts[menuId];
        },
        async loadByRole(roleId) {
            this.reset();
            const { data } = await api.get(`/kpi_security/menu-roles/by-role/${roleId}?includeDeleted=true`);
            for (const item of data ?? []) {
                const draft = {
                    id: item.id,
                    menuId: item.menuId,
                    enabled: item.status === "ACTIVE",
                    isReaded: item.isReaded,
                    isCreated: item.isCreated,
                    isEdited: item.isEdited,
                    permitDeleted: item.permitDeleted,
                    isReports: item.isReports,
                    reportsPermit: item.reportsPermit ?? "{}",
                    status: item.status,
                };
                this.drafts[item.menuId] = { ...draft };
                this.original[item.menuId] = { ...draft };
            }
        },
        async sync(roleId, createdBy) {
            for (const menuId in this.drafts) {
                const draft = this.drafts[menuId];
                const original = this.original[menuId];
                // 🔹 NUEVO
                if (!original && draft.enabled) {
                    await api.post("/kpi_security/menu-roles", {
                        roleId,
                        menuId,
                        status: "ACTIVE",
                        createdBy,
                        isReaded: draft.isReaded,
                        isCreated: draft.isCreated,
                        isEdited: draft.isEdited,
                        permitDeleted: draft.permitDeleted,
                        isReports: draft.isReports,
                        reportsPermit: draft.reportsPermit,
                    });
                }
                // 🔹 EXISTENTE
                if (original) {
                    const changed = draft.enabled !== original.enabled ||
                        draft.isReaded !== original.isReaded ||
                        draft.isCreated !== original.isCreated ||
                        draft.isEdited !== original.isEdited ||
                        draft.permitDeleted !== original.permitDeleted ||
                        draft.isReports !== original.isReports ||
                        draft.reportsPermit !== original.reportsPermit;
                    if (!changed)
                        continue;
                    await api.patch(`/kpi_security/menu-roles/${original.id}`, {
                        roleId,
                        menuId,
                        status: draft.enabled ? "ACTIVE" : "INACTIVE",
                        createdBy,
                        isReaded: draft.isReaded,
                        isCreated: draft.isCreated,
                        isEdited: draft.isEdited,
                        permitDeleted: draft.permitDeleted,
                        isReports: draft.isReports,
                        reportsPermit: draft.reportsPermit,
                    });
                }
            }
        },
    },
});
