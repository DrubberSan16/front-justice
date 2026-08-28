import axios from "axios";
import { env } from "@/app/config/env";
import { useAuthStore } from "@/app/stores/auth.store";
import { useBranchScopeStore } from "@/app/stores/branch-scope.store";
import { useUiStore } from "@/app/stores/ui.store";
import { normalizeRequestPayload } from "@/app/http/request-context";

type TrackedRequestConfig = {
  meta?: {
    skipGlobalLoading?: boolean;
    skipTechnicalHandling?: boolean;
  };
  metadata?: {
    trackedByUi?: boolean;
  };
};

function buildAuthHeaders() {
  const auth = useAuthStore();
  const headers: Record<string, string> = {};
  if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.user?.role?.nombre) headers["X-Role-Name"] = auth.user.role.nombre;
  if (auth.user?.id) headers["X-User-Id"] = auth.user.id;
  if (auth.user?.email) headers["X-User-Email"] = auth.user.email;
  if (auth.user?.nameUser) headers["X-User-Name"] = auth.user.nameUser;
  if (auth.user?.nameSurname || auth.user?.nameUser) {
    headers["X-User-Display-Name"] = auth.user.nameSurname || auth.user.nameUser;
  }
  return headers;
}

function shouldTrackRequest(config: any) {
  return !config?.meta?.skipGlobalLoading;
}

function shouldHandleTechnicalError(config: any) {
  return !config?.meta?.skipTechnicalHandling;
}

function finalizeTrackedRequest(config?: TrackedRequestConfig | null) {
  if (!config?.metadata?.trackedByUi) return;
  useUiStore().endHttpRequest();
}

function resolveServiceModuleFromUrl(config?: any) {
  const rawUrl = String(config?.url || "").trim();
  if (rawUrl.includes("/kpi_inventory/")) return "kpi_inventory";
  if (rawUrl.includes("/kpi_maintenance/")) return "kpi_maintenance";
  if (rawUrl.includes("/kpi_security/")) return "kpi_security";
  if (rawUrl.includes("/kpi_notification/")) return "kpi_notification";
  return "front_justice";
}

function extractSupportTicket(payload: any) {
  const resolved = String(
    payload?.supportTicket ||
      payload?.support_ticket ||
      payload?.ticket ||
      payload?.data?.supportTicket ||
      payload?.data?.ticket ||
      "",
  ).trim();
  return resolved || null;
}

function buildTechnicalErrorMessage(ticket: string | null) {
  return `Error tecnico, informacion enviada al equipo de soporte. TICKET: ${ticket || "PENDIENTE"}`;
}

async function createTechnicalTicket(err: any) {
  const auth = useAuthStore();
  const moduleMicroservice = resolveServiceModuleFromUrl(err?.config);
  const method = String(err?.config?.method || "GET").toUpperCase();
  const url = String(err?.config?.url || "").trim() || "sin-url";
  const statusCode = Number(err?.response?.status || 500);
  const description = [
    `Incidente tecnico capturado en cliente`,
    `Modulo: ${moduleMicroservice}`,
    `HTTP: ${method} ${url}`,
    `Status: ${statusCode}`,
    `Usuario: ${auth.user?.nameUser || auth.user?.email || "SIN_USUARIO"}`,
    `Detalle: ${String(err?.response?.data?.message || err?.message || "Internal Server Error").slice(0, 1200)}`,
  ].join(" | ");

  try {
    const { data } = await axios.post(
      `${env.baseUrl}/kpi_security/log-transacts`,
      {
        moduleMicroservice,
        status: "ERROR",
        typeLog: "TECHNICAL_INCIDENT",
        description,
        createdBy: auth.user?.nameUser || auth.user?.email || "FRONTEND",
        requestMethod: method,
        requestUrl: url,
        requestPayload: normalizeRequestPayload(err?.config?.data),
      },
      {
        headers: buildAuthHeaders(),
      },
    );

    return String(
      data?.id ||
        data?.data?.id ||
        data?.log?.id ||
        "",
    ).trim() || null;
  } catch {
    return null;
  }
}

function reportTechnicalIncident(ticket: string | null, err: any) {
  const auth = useAuthStore();
  const payload = {
    ticket,
    module: resolveServiceModuleFromUrl(err?.config),
    request_url: String(err?.config?.url || "").trim() || null,
    method: String(err?.config?.method || "GET").toUpperCase(),
    status_code: Number(err?.response?.status || 500),
    user_name: auth.user?.nameUser || null,
    user_display_name: auth.user?.nameSurname || auth.user?.nameUser || null,
    user_email: auth.user?.email || null,
    frontend_route:
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : null,
    response_message: String(
      err?.response?.data?.message || err?.message || "Internal Server Error",
    ).slice(0, 2000),
    response_payload: err?.response?.data ?? null,
    request_payload: err?.config?.data ?? null,
  };

  void axios.post(
    `${env.baseUrl}/kpi_maintenance/support/incidents`,
    payload,
    {
      headers: buildAuthHeaders(),
    },
  ).catch(() => undefined);
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

  if (auth.user?.id) {
    config.headers = config.headers ?? {};
    config.headers["X-User-Id"] = auth.user.id;
  }

  if (auth.user?.email) {
    config.headers = config.headers ?? {};
    config.headers["X-User-Email"] = auth.user.email;
  }

  if (auth.user?.nameUser) {
    config.headers = config.headers ?? {};
    config.headers["X-User-Name"] = auth.user.nameUser;
  }

  if (auth.user?.nameSurname || auth.user?.nameUser) {
    config.headers = config.headers ?? {};
    config.headers["X-User-Display-Name"] =
      auth.user.nameSurname || auth.user.nameUser;
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
  async (err) => {
    finalizeTrackedRequest(err?.config as TrackedRequestConfig | undefined);
    if (err?.response?.status === 401) {
      const auth = useAuthStore();
      auth.logout();
    }

    const statusCode = Number(err?.response?.status || 0);
    const config = err?.config as TrackedRequestConfig | undefined;
    if (statusCode >= 500 && shouldHandleTechnicalError(config)) {
      let ticket = extractSupportTicket(err?.response?.data);
      if (!ticket) {
        ticket = await createTechnicalTicket(err);
      }

      const technicalMessage = buildTechnicalErrorMessage(ticket);
      if (err?.response?.data && typeof err.response.data === "object") {
        err.response.data.message = technicalMessage;
        err.response.data.supportTicket = ticket || "";
      }
      err.message = technicalMessage;
      reportTechnicalIncident(ticket, err);
    }

    return Promise.reject(err);
  }
);
