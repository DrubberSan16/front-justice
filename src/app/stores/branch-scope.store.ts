import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { LoginResponse } from "@/app/types/auth.types";

type AuthUser = LoginResponse["user"] | null | undefined;
type BranchOption = {
  id: string;
  codigo: string;
  nombre: string;
};

const LS_PREFIX = "kpi_branch_scope_v1";
const ALL_BRANCHES_VALUE = "__ALL__";

function storageKeyForUser(userId: string) {
  return `${LS_PREFIX}:${userId}`;
}

function normalizeOptions(user: AuthUser): BranchOption[] {
  const rows = Array.isArray(user?.effectiveSucursales) ? user?.effectiveSucursales : [];
  const unique = new Map<string, BranchOption>();
  rows.forEach((item) => {
    const id = String(item?.id || "").trim();
    if (!id) return;
    unique.set(id, {
      id,
      codigo: String(item?.codigo || "").trim(),
      nombre: String(item?.nombre || "").trim(),
    });
  });
  return [...unique.values()].sort((a, b) =>
    `${a.codigo} ${a.nombre}`.localeCompare(`${b.codigo} ${b.nombre}`, "es"),
  );
}

export const useBranchScopeStore = defineStore("branch-scope", () => {
  const userId = ref<string | null>(null);
  const options = ref<BranchOption[]>([]);
  const selectedSucursalId = ref<string | null>(null);

  const selectItems = computed(() => {
    const rows = options.value.map((item) => ({
      title: `${item.codigo} - ${item.nombre}`.replace(/^\s*-\s*/, "").trim(),
      value: item.id,
    }));
    if (rows.length > 1) {
      return [{ title: "Todas mis sucursales", value: ALL_BRANCHES_VALUE }, ...rows];
    }
    return rows;
  });

  const visible = computed(() => options.value.length > 0);
  const effectiveSelectedSucursalId = computed(() =>
    selectedSucursalId.value && selectedSucursalId.value !== ALL_BRANCHES_VALUE
      ? selectedSucursalId.value
      : null,
  );
  const selectedSucursal = computed(() =>
    options.value.find((item) => item.id === effectiveSelectedSucursalId.value) ?? null,
  );
  const selectedLabel = computed(() => {
    if (selectedSucursal.value) {
      return `${selectedSucursal.value.codigo} - ${selectedSucursal.value.nombre}`
        .replace(/^\s*-\s*/, "")
        .trim();
    }
    return options.value.length > 1 ? "Todas mis sucursales" : "";
  });

  function persist() {
    if (!userId.value) return;
    localStorage.setItem(
      storageKeyForUser(userId.value),
      selectedSucursalId.value || ALL_BRANCHES_VALUE,
    );
  }

  function syncFromUser(user: AuthUser) {
    const nextUserId = String(user?.id || "").trim();
    const nextOptions = normalizeOptions(user);

    if (!nextUserId || !nextOptions.length) {
      clear();
      return;
    }

    userId.value = nextUserId;
    options.value = nextOptions;

    const saved = localStorage.getItem(storageKeyForUser(nextUserId));
    const allowedIds = new Set(nextOptions.map((item) => item.id));

    if (saved === ALL_BRANCHES_VALUE && nextOptions.length > 1) {
      selectedSucursalId.value = ALL_BRANCHES_VALUE;
      return;
    }

    if (saved && allowedIds.has(saved)) {
      selectedSucursalId.value = saved;
      return;
    }

    selectedSucursalId.value =
      nextOptions.length === 1 ? nextOptions[0]?.id ?? null : ALL_BRANCHES_VALUE;
    persist();
  }

  function setSelectedSucursal(value: string | null) {
    if (!value || value === ALL_BRANCHES_VALUE) {
      selectedSucursalId.value =
        options.value.length > 1 ? ALL_BRANCHES_VALUE : options.value[0]?.id ?? null;
    } else {
      selectedSucursalId.value = value;
    }
    persist();
  }

  function clear() {
    if (userId.value) {
      localStorage.removeItem(storageKeyForUser(userId.value));
    }
    userId.value = null;
    options.value = [];
    selectedSucursalId.value = null;
  }

  return {
    options,
    visible,
    selectItems,
    selectedSucursalId,
    effectiveSelectedSucursalId,
    selectedSucursal,
    selectedLabel,
    syncFromUser,
    setSelectedSucursal,
    clear,
  };
});
