import { defineStore } from "pinia";
import { api } from "@/app/http/api";
import type { MenuUser, SaveMenuUserBody } from "@/app/types/menu-users.types";
import type { MenuRole } from "@/app/types/menu-roles.types"; // ya lo tienes

export type PermissionDraft = {
  id?: string;        // existe si ya estaba guardado en menu-users
  menuId: string;
  enabled: boolean;

  isReaded: boolean;
  isCreated: boolean;
  isEdited: boolean;
  permitDeleted: boolean;
  isReports: boolean;
  reportsPermit: string;

  status?: "ACTIVE" | "INACTIVE" | string;
};

type State = {
  drafts: Record<string, PermissionDraft>;    // menuId -> draft
  original: Record<string, PermissionDraft>;  // snapshot inicial
  loading: boolean;
  error: string | null;
};

const ENDPOINTS = {
  // Ajusta SOLO aquí si difiere en tu backend
  byUser: (userId: string) => `/kpi_security/menu-users/by-user/${userId}?includeDeleted=true`,
  create: `/kpi_security/menu-users`,
  patch: (id: string) => `/kpi_security/menu-users/${id}`,
};

const defaultDraft = (menuId: string): PermissionDraft => ({
  menuId,
  enabled: false,
  isReaded: false,
  isCreated: false,
  isEdited: false,
  permitDeleted: false,
  isReports: false,
  reportsPermit: "{}",
  status: "ACTIVE",
});

export const useMenuUsersProfileStore = defineStore("menuUsersProfile", {
  state: (): State => ({
    drafts: {},
    original: {},
    loading: false,
    error: null,
  }),

  actions: {
    reset() {
      this.drafts = {};
      this.original = {};
      this.loading = false;
      this.error = null;
    },

    getDraft(menuId: string) {
      if (!this.drafts[menuId]) this.drafts[menuId] = defaultDraft(menuId);
      return this.drafts[menuId];
    },

    // 1) Cargar perfil del usuario (para edición)
    async loadByUser(userId: string) {
      this.loading = true;
      this.error = null;

      try {
        this.drafts = {};
        this.original = {};

        const { data } = await api.get<MenuUser[]>(ENDPOINTS.byUser(userId));

        for (const item of data ?? []) {
          const d: PermissionDraft = {
            id: item.id,
            menuId: item.menuId,
            enabled: item.status === "ACTIVE",
            isReaded: !!item.isReaded,
            isCreated: !!item.isCreated,
            isEdited: !!item.isEdited,
            permitDeleted: !!item.permitDeleted,
            isReports: !!item.isReports,
            reportsPermit: item.reportsPermit ?? "{}",
            status: item.status,
          };

          this.drafts[item.menuId] = { ...d };
          this.original[item.menuId] = { ...d };
        }
      } catch (e: any) {
        this.error = e?.response?.data?.message || "No se pudo cargar la perfilería del usuario.";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    // 2) Precargar perfil por rol (para creación)
    // Toma menu-roles del rol y arma drafts enabled=true con permisos del rol.
    setDraftsFromRoleMenus(menuRoles: MenuRole[]) {
      this.reset();

      for (const mr of menuRoles ?? []) {
        // si el rol tiene registros INACTIVE, no precargamos
        const enabled = mr.status === "ACTIVE";
        this.drafts[mr.menuId] = {
          menuId: mr.menuId,
          enabled,
          isReaded: !!mr.isReaded,
          isCreated: !!mr.isCreated,
          isEdited: !!mr.isEdited,
          permitDeleted: !!mr.permitDeleted,
          isReports: !!mr.isReports,
          reportsPermit: mr.reportsPermit ?? "{}",
          status: mr.status,
        };
      }

      // en creación no hay "original" todavía
      this.original = {};
    },

    // 3) Crear perfil del usuario (para creación): POST uno por uno SOLO enabled=true
    async createProfileForUser(userId: string, createdBy: string) {
      this.loading = true;
      this.error = null;

      try {
        const entries = Object.values(this.drafts).filter((d) => d.enabled);

        for (const d of entries) {
          const body: SaveMenuUserBody = {
            userId,
            menuId: d.menuId,
            status: "ACTIVE",
            createdBy,
            isReaded: d.isReaded,
            isCreated: d.isCreated,
            isEdited: d.isEdited,
            permitDeleted: d.permitDeleted,
            isReports: d.isReports,
            reportsPermit: d.reportsPermit ?? "{}",
          };

          await api.post(ENDPOINTS.create, body);
        }

        // refresca para tener ids y snapshot original
        await this.loadByUser(userId);
      } catch (e: any) {
        this.error = e?.response?.data?.message || "No se pudo crear la perfilería del usuario.";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    // 4) Sincronización diferencial (edición): POST/PATCH/INACTIVE uno por uno
    async sync(userId: string, createdBy: string) {
      this.loading = true;
      this.error = null;

      try {
        const menuIds = new Set([
          ...Object.keys(this.drafts),
          ...Object.keys(this.original),
        ]);

        for (const menuId of menuIds) {
          const draft = this.drafts[menuId] ?? defaultDraft(menuId);
          const original = this.original[menuId];

          // NUEVO (no existía antes) y enabled=true => POST
          if (!original && draft.enabled) {
            const body: SaveMenuUserBody = {
              userId,
              menuId,
              status: "ACTIVE",
              createdBy,
              isReaded: draft.isReaded,
              isCreated: draft.isCreated,
              isEdited: draft.isEdited,
              permitDeleted: draft.permitDeleted,
              isReports: draft.isReports,
              reportsPermit: draft.reportsPermit ?? "{}",
            };

            await api.post(ENDPOINTS.create, body);
            continue;
          }

          // EXISTENTE => PATCH si cambió algo o cambió enabled
          if (original) {
            const changed =
              draft.enabled !== original.enabled ||
              draft.isReaded !== original.isReaded ||
              draft.isCreated !== original.isCreated ||
              draft.isEdited !== original.isEdited ||
              draft.permitDeleted !== original.permitDeleted ||
              draft.isReports !== original.isReports ||
              (draft.reportsPermit ?? "{}") !== (original.reportsPermit ?? "{}");

            if (!changed) continue;

            await api.patch(ENDPOINTS.patch(original.id!), {
              userId,
              menuId,
              status: draft.enabled ? "ACTIVE" : "INACTIVE",
              createdBy,
              isReaded: draft.isReaded,
              isCreated: draft.isCreated,
              isEdited: draft.isEdited,
              permitDeleted: draft.permitDeleted,
              isReports: draft.isReports,
              reportsPermit: draft.reportsPermit ?? "{}",
            });
          }
        }

        // refresca snapshot
        await this.loadByUser(userId);
      } catch (e: any) {
        this.error = e?.response?.data?.message || "No se pudo sincronizar la perfilería del usuario.";
        throw e;
      } finally {
        this.loading = false;
      }
    },
  },
});