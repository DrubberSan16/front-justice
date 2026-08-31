import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { io, type Socket } from "socket.io-client";
import { api } from "@/app/http/api";
import { env } from "@/app/config/env";
import { useAuthStore } from "@/app/stores/auth.store";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  module?: string;
  entityType?: string | null;
  entityId?: string | null;
  level?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  recipients?: string[];
  payload?: Record<string, unknown>;
};

function resolveSocketOrigin() {
  try {
    return new URL(env.baseUrl, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
}

function normalizeRecipientFilter(recipient?: string | string[] | null) {
  const values = Array.isArray(recipient) ? recipient : [recipient];
  return [
    ...new Set(
      values
        .flatMap((item) => String(item || "").split(","))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].join(",");
}

export const useNotificationsStore = defineStore("notifications", () => {
  const items = ref<NotificationItem[]>([]);
  const loading = ref(false);
  const connected = ref(false);
  const startedForRecipient = ref<string | null>(null);
  let socket: Socket | null = null;

  const unreadCount = computed(
    () => items.value.filter((item) => String(item.status || "").toUpperCase() !== "READ").length,
  );
  const unreadItems = computed(() =>
    items.value.filter((item) => String(item.status || "").toUpperCase() !== "READ"),
  );

  function sortItems() {
    items.value.sort((a, b) => {
      const left = new Date(a.created_at || 0).getTime();
      const right = new Date(b.created_at || 0).getTime();
      return right - left;
    });
    items.value = items.value.slice(0, 40);
  }

  function upsert(item: NotificationItem) {
    if (String(item.status || "").toUpperCase() === "READ") {
      items.value = items.value.filter((current) => current.id !== item.id);
      return;
    }
    const index = items.value.findIndex((current) => current.id === item.id);
    if (index >= 0) items.value[index] = { ...items.value[index], ...item };
    else items.value.unshift(item);
    sortItems();
  }

  async function load(recipient?: string | string[] | null) {
    const recipientFilter = normalizeRecipientFilter(recipient);
    loading.value = true;
    try {
      const { data } = await api.get("/kpi_notification/notifications/in-app", {
        meta: { skipGlobalLoading: true },
        params: {
          limit: 20,
          recipient: recipientFilter || undefined,
          status: "NEW",
        },
      } as any);
      const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      items.value = rows.filter((item: NotificationItem) => String(item?.status || "").toUpperCase() !== "READ");
      sortItems();
    } finally {
      loading.value = false;
    }
  }

  function connect(recipient?: string | string[] | null) {
    const recipientFilter = normalizeRecipientFilter(recipient);
    disconnect();
    const auth = useAuthStore();
    if (!auth.accessToken) return;
    const origin = resolveSocketOrigin();
    socket = io(`${origin}/notifications`, {
      path: "/kpi_notification/socket.io",
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: { token: auth.accessToken },
      query: recipientFilter ? { recipient: recipientFilter } : {},
    });
    socket.on("connect", () => {
      connected.value = true;
    });
    socket.on("disconnect", () => {
      connected.value = false;
    });
    socket.on("notification:new", (payload: NotificationItem) => {
      upsert(payload);
    });
  }

  function disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    connected.value = false;
  }

  async function start(recipient?: string | string[] | null) {
    const normalized = normalizeRecipientFilter(recipient) || null;
    if (startedForRecipient.value === normalized && (socket || items.value.length)) {
      return;
    }
    startedForRecipient.value = normalized;
    await load(normalized);
    connect(normalized);
  }

  function stop() {
    startedForRecipient.value = null;
    disconnect();
    items.value = [];
  }

  async function markAsRead(id: string) {
    await api.patch(`/kpi_notification/notifications/in-app/${id}/read`);
    upsert({
      ...(items.value.find((item) => item.id === id) || {
        id,
        title: "",
        body: "",
      }),
      status: "READ",
    } as NotificationItem);
  }

  async function markAllAsRead(recipient?: string | string[] | null) {
    const recipientFilter = normalizeRecipientFilter(recipient);
    await api.patch("/kpi_notification/notifications/in-app/read-all", null, {
      params: {
        recipient: recipientFilter || undefined,
      },
    });
    items.value = [];
  }

  return {
    items,
    unreadItems,
    loading,
    connected,
    unreadCount,
    start,
    stop,
    load,
    markAsRead,
    markAllAsRead,
    upsert,
  };
});
