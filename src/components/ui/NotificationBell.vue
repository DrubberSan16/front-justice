<template>
  <v-menu location="bottom end" :close-on-content-click="false" width="420">
    <template #activator="{ props }">
      <v-btn icon v-bind="props" variant="text">
        <v-badge :content="store.unreadCount" :model-value="store.unreadCount > 0" color="error">
          <v-icon>mdi-bell-outline</v-icon>
        </v-badge>
      </v-btn>
    </template>

    <v-card rounded="xl">
      <v-card-title class="d-flex align-center justify-space-between">
        <span class="text-subtitle-1 font-weight-bold">Notificaciones</span>
        <v-chip size="small" :color="store.connected ? 'success' : 'warning'" variant="tonal">
          {{ store.connected ? 'En línea' : 'Sincronizando' }}
        </v-chip>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-0">
        <v-list density="compact" lines="two" style="max-height: 420px; overflow: auto;">
          <v-list-item
            v-for="item in store.items"
            :key="item.id"
            :title="item.title"
            :subtitle="buildSubtitle(item)"
            @click="markRead(item.id)"
          >
            <template #prepend>
              <v-avatar size="28" :color="item.status === 'READ' ? 'grey-lighten-2' : 'primary'">
                <v-icon size="18">mdi-bell</v-icon>
              </v-avatar>
            </template>
            <template #append>
              <v-chip size="x-small" variant="tonal" :color="item.status === 'READ' ? 'default' : 'primary'">
                {{ item.status === 'READ' ? 'Leída' : 'Nueva' }}
              </v-chip>
            </template>
          </v-list-item>
          <v-list-item
            v-if="!store.items.length && !store.loading"
            title="Sin notificaciones"
            subtitle="Todavía no hay eventos recientes."
          />
        </v-list>
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="!store.unreadCount" @click="markAll">Marcar todo leído</v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/app/stores/auth.store";
import { useNotificationsStore } from "@/app/stores/notifications.store";
import { formatDateTime } from "@/app/utils/date-time";

const auth = useAuthStore();
const store = useNotificationsStore();

function buildSubtitle(item: any) {
  const timestamp = item?.created_at ? formatDateTime(item.created_at, "") : "";
  const moduleLabel = item?.module ? ` · ${item.module}` : "";
  return `${item?.body || ""}${moduleLabel}${timestamp ? ` · ${timestamp}` : ""}`;
}

function markRead(id: string) {
  if (!id) return;
  void store.markAsRead(id);
}

function markAll() {
  void store.markAllAsRead(
    [auth.user?.id, auth.user?.nameUser, auth.user?.email].filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    ),
  );
}
</script>
