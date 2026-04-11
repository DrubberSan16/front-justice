import axios from "axios";
import { env } from "@/app/config/env";
import { useAuthStore } from "@/app/stores/auth.store";
import { useBranchScopeStore } from "@/app/stores/branch-scope.store";

export const api = axios.create({
  baseURL: env.baseUrl,
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  const branchScope = useBranchScopeStore();

  if (auth.accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }

  const method = String(config.method || "get").toUpperCase();
  if (method === "GET" && branchScope.effectiveSelectedSucursalId) {
    config.headers = config.headers ?? {};
    config.headers["X-Sucursal-Id"] = branchScope.effectiveSelectedSucursalId;
  }

  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      const auth = useAuthStore();
      auth.logout();
    }
    return Promise.reject(err);
  }
);
