import axios from "axios";
import { env } from "@/app/config/env";
import { useAuthStore } from "@/app/stores/auth.store";
import { useBranchScopeStore } from "@/app/stores/branch-scope.store";
import { useUiStore } from "@/app/stores/ui.store";

type TrackedRequestConfig = {
  metadata?: {
    trackedByUi?: boolean;
  };
};

function shouldTrackRequest(config: any) {
  return !config?.meta?.skipGlobalLoading;
}

function finalizeTrackedRequest(config?: TrackedRequestConfig | null) {
  if (!config?.metadata?.trackedByUi) return;
  useUiStore().endHttpRequest();
}

export const api = axios.create({
  baseURL: env.baseUrl,
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  const branchScope = useBranchScopeStore();
  const ui = useUiStore();
  const trackedConfig = config as typeof config & TrackedRequestConfig;

  if (auth.accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }

  if (auth.user?.role?.nombre) {
    config.headers = config.headers ?? {};
    config.headers["X-Role-Name"] = auth.user.role.nombre;
  }

  const method = String(config.method || "get").toUpperCase();
  if (method && branchScope.effectiveSelectedSucursalId) {
    config.headers = config.headers ?? {};
    config.headers["X-Sucursal-Id"] = branchScope.effectiveSelectedSucursalId;
  }

  trackedConfig.metadata = trackedConfig.metadata ?? {};
  trackedConfig.metadata.trackedByUi = shouldTrackRequest(config);
  if (trackedConfig.metadata.trackedByUi) {
    ui.beginHttpRequest();
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    finalizeTrackedRequest(response.config as TrackedRequestConfig);
    return response;
  },
  (err) => {
    finalizeTrackedRequest(err?.config as TrackedRequestConfig | undefined);
    if (err?.response?.status === 401) {
      const auth = useAuthStore();
      auth.logout();
    }
    return Promise.reject(err);
  }
);
