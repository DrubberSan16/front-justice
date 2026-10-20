import { computed, onScopeDispose, ref, watch } from "vue";
import { api } from "@/app/http/api";
import type {
  TwinAsset,
  TwinCapture,
  TwinEquipmentOption,
  TwinSimulation,
  TwinState,
  TwinSimulationInput,
  TwinAnalysis,
  TwinResearch,
} from "@/app/types/digital-twin.types";

const endpoint = "/kpi_process/digital-twins";
export function useDigitalTwin(enabled: () => boolean) {
  const assets = ref<TwinAsset[]>([]),
    selectedId = ref(""),
    search = ref(""),
    page = ref(1),
    pages = ref(1),
    total = ref(0);
  const state = ref<TwinState | null>(null),
    history = ref<TwinCapture[]>([]),
    simulation = ref<TwinSimulation | null>(null);
  const busy = ref(false),
    analysis = ref<TwinAnalysis | null>(null),
    analysisBusy = ref(false),
    research = ref<TwinResearch | null>(null),
    reading = ref(false),
    saving = ref(false),
    error = ref(""),
    historical = ref<TwinState | null>(null);
  let activeRequest: AbortController | undefined,
    sequence = 0,
    listSequence = 0;
  let researchTimer: ReturnType<typeof setTimeout> | undefined,
    researchSequence = 0;
  const researchBusy = computed(
    () =>
      research.value?.status === "QUEUED" ||
      research.value?.status === "RUNNING",
  );
  const researchConfig = {
    meta: { skipGlobalLoading: true, skipTechnicalHandling: true },
  } as any;
  const message = (e: any) =>
    typeof e?.response?.data?.message === "string"
      ? e.response.data.message
      : "No se pudo completar la consulta. Intenta nuevamente.";
  const selected = computed(() =>
    assets.value.find((a) => a.id === selectedId.value),
  );
  async function loadAssets() {
    if (!enabled()) return;
    const seq = ++listSequence;
    busy.value = true;
    try {
      const { data } = await api.get(endpoint, {
        params: { search: search.value, page: page.value, limit: 30 },
      });
      if (seq !== listSequence) return;
      assets.value = data.data;
      pages.value = data.pagination.totalPages || 1;
      total.value = data.pagination.total;
      if (!assets.value.some((a) => a.id === selectedId.value))
        selectedId.value = assets.value[0]?.id || "";
      error.value = "";
    } catch (e) {
      if (seq === listSequence) error.value = message(e);
    } finally {
      if (seq === listSequence) busy.value = false;
    }
  }
  async function loadState() {
    if (!enabled() || !selectedId.value) return;
    activeRequest?.abort();
    const controller = new AbortController();
    activeRequest = controller;
    const seq = ++sequence;
    reading.value = true;
    try {
      const { data } = await api.get(`${endpoint}/${selectedId.value}/state`, {
        signal: controller.signal,
      });
      if (seq !== sequence) return;
      state.value = data;
      error.value = "";
      void loadAnalysis();
      if (!historical.value && !researchBusy.value) void loadResearch();
    } catch (e) {
      if (!controller.signal.aborted && seq === sequence)
        error.value = message(e);
    } finally {
      if (seq === sequence) reading.value = false;
    }
  }
  async function loadHistory() {
    const id = selectedId.value;
    if (!id || !enabled()) return;
    try {
      const { data } = await api.get(`${endpoint}/${id}/history`);
      if (id === selectedId.value) history.value = data;
    } catch (e) {
      error.value = message(e);
    }
  }
  async function loadAnalysis() {
    const id = selectedId.value;
    if (!id || !enabled()) return;
    try {
      const { data } = await api.get(`${endpoint}/${id}/analysis`);
      if (id === selectedId.value) analysis.value = data;
    } catch (e) {
      if (id === selectedId.value) error.value = message(e);
    }
  }
  async function analyze() {
    const id = selectedId.value;
    if (
      !id ||
      !enabled() ||
      historical.value ||
      analysisBusy.value ||
      researchBusy.value ||
      research.value?.status !== "READY"
    )
      return;
    analysisBusy.value = true;
    try {
      const { data } = await api.post(`${endpoint}/${id}/analysis`, undefined, {
        timeout: 90000,
        meta: { skipGlobalLoading: true, skipTechnicalHandling: true },
      } as any);
      if (id === selectedId.value) {
        analysis.value = data;
        error.value = "";
      }
    } catch (e) {
      if (id === selectedId.value) error.value = message(e);
    } finally {
      analysisBusy.value = false;
    }
  }
  async function loadResearch(refresh = false) {
    const id = selectedId.value,
      seq = ++researchSequence;
    if (!id || !enabled()) return;
    clearTimeout(researchTimer);
    try {
      let { data } = await api.get(
        `${endpoint}/${id}/research`,
        researchConfig,
      );
      if (id !== selectedId.value || seq !== researchSequence) return;
      if (
        !historical.value &&
        data.available &&
        (refresh || data.status === "IDLE" || data.status === "STALE")
      ) {
        ({ data } = await api.post(
          `${endpoint}/${id}/research`,
          { refresh },
          researchConfig,
        ));
        if (id !== selectedId.value || seq !== researchSequence) return;
      }
      const wasBusy = researchBusy.value;
      research.value = data;
      if (data.status === "RUNNING" || data.status === "QUEUED")
        researchTimer = setTimeout(() => void loadResearch(), 3500);
      else if (
        !historical.value &&
        data.status === "READY" &&
        (wasBusy || state.value?.technical?.research?.status !== "COMPLETE")
      )
        void loadState();
    } catch (e) {
      if (id === selectedId.value && seq === researchSequence)
        research.value = {
          available: true,
          status: "ERROR",
          error: message(e),
          configuration_hash: "",
          cached: false,
        };
    }
  }
  async function capture() {
    if (!enabled() || !selectedId.value || historical.value) return;
    activeRequest?.abort();
    sequence++;
    reading.value = false;
    const id = selectedId.value;
    saving.value = true;
    try {
      const { data } = await api.post(`${endpoint}/${id}/capture`);
      if (id === selectedId.value) {
        state.value = data.state;
        await loadHistory();
      }
      await loadAssets();
    } catch (e) {
      error.value = message(e);
    } finally {
      saving.value = false;
    }
  }
  async function openCapture(captureId: string) {
    const id = selectedId.value;
    try {
      const { data } = await api.get(`${endpoint}/${id}/history/${captureId}`);
      if (id === selectedId.value) {
        historical.value = data.state_json;
        simulation.value = null;
      }
    } catch (e) {
      error.value = message(e);
    }
  }
  async function simulate(input: TwinSimulationInput) {
    if (!enabled() || historical.value) return;
    const id = selectedId.value;
    saving.value = true;
    simulation.value = null;
    try {
      const { data } = await api.post(`${endpoint}/${id}/simulate`, input);
      if (id === selectedId.value) simulation.value = data;
    } catch (e) {
      error.value = message(e);
    } finally {
      saving.value = false;
    }
  }
  async function equipmentOptions(term = ""): Promise<TwinEquipmentOption[]> {
    if (!enabled()) return [];
    const { data } = await api.get(`${endpoint}/equipment-options`, {
      params: { search: term },
    });
    return data;
  }
  async function saveAsset(name: string, equipmentId: string, id?: string) {
    if (!enabled()) return false;
    saving.value = true;
    try {
      const payload = { name, equipment_id: equipmentId };
      const { data } = id
        ? await api.patch(`${endpoint}/${id}`, payload)
        : await api.post(endpoint, payload);
      search.value = "";
      page.value = 1;
      await loadAssets();
      selectedId.value = data.id;
      await loadState();
      return true;
    } catch (e) {
      error.value = message(e);
      return false;
    } finally {
      saving.value = false;
    }
  }
  async function archiveAsset() {
    if (!enabled() || !selectedId.value) return false;
    saving.value = true;
    try {
      await api.delete(`${endpoint}/${selectedId.value}`);
      await loadAssets();
      return true;
    } catch (e) {
      error.value = message(e);
      return false;
    } finally {
      saving.value = false;
    }
  }
  watch(selectedId, () => {
    sequence++;
    activeRequest?.abort();
    state.value = null;
    history.value = [];
    simulation.value = null;
    historical.value = null;
    analysis.value = null;
    research.value = null;
    researchSequence++;
    clearTimeout(researchTimer);
    if (selectedId.value) {
      void loadState();
      void loadHistory();
    }
  });
  const timer = window.setInterval(() => {
    if (
      document.visibilityState === "visible" &&
      !historical.value &&
      !reading.value &&
      !saving.value &&
      !analysisBusy.value
    )
      void loadState();
  }, 60000);
  onScopeDispose(() => {
    clearTimeout(researchTimer);
    researchSequence++;
    clearInterval(timer);
    activeRequest?.abort();
    sequence++;
    listSequence++;
  });
  return {
    assets,
    analysis,
    research,
    researchBusy,
    researchDocuments: () => loadResearch(true),
    analysisBusy,
    analyze,
    selectedId,
    selected,
    search,
    page,
    pages,
    total,
    state,
    history,
    simulation,
    historical,
    busy,
    reading,
    saving,
    error,
    loadAssets,
    loadState,
    loadHistory,
    capture,
    openCapture,
    simulate,
    equipmentOptions,
    saveAsset,
    archiveAsset,
  };
}
