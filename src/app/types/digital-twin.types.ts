export type TwinCondition = {
  status: string;
  reasons: string[];
  basis: string;
};
export type TwinAsset = {
  id: string;
  code: string;
  name: string;
  equipment_id: string | null;
  equipment_code: string | null;
  equipment_name: string | null;
  last_snapshot_at: string | null;
  condition: TwinCondition | null;
};
export type TwinComponent = {
  id: string;
  parent_id: string | null;
  codigo: string;
  nombre: string;
  nombre_oficial: string | null;
  serie: string | null;
  categoria: string | null;
  descripcion: string | null;
};
export type TwinState = {
  version: number;
  as_of: string;
  twin: { id: string; code: string; name: string };
  identity: {
    id: string;
    code: string;
    name: string;
    operational_name: string;
    model: string | null;
    serie: string | null;
    brand: string | null;
    location: string | null;
    central: string | null;
  };
  operation: {
    status: string;
    running: string;
    since: string | null;
    criticality: string;
  };
  horometer: {
    measured: number | null;
    measured_at: string | null;
    estimated: number | null;
    calculated: boolean;
    clock_since: string | null;
    clock_issue: string | null;
    source: string;
  };
  maintenance: {
    interval: number;
    base: number;
    target: number;
    remaining: number;
    reliable: boolean;
    service_code: string | null;
    explanation: string;
  } | null;
  simulation_basis?: TwinCalibration;
  condition: TwinCondition;
  components: TwinComponent[];
  alerts: Array<{
    id: string;
    tipo_alerta: string;
    detalle: string;
    nivel: string;
    estado: string;
  }>;
  orders: Array<{
    id: string;
    code: string;
    title: string;
    status_workflow: string;
    equipo_componente_id: string | null;
  }>;
  oil: Array<{
    id: string;
    codigo: string;
    compartimento_principal: string;
    estado_diagnostico: string;
    fecha_reporte: string;
    diagnostico: string;
  }>;
  quality: Array<{
    key: string;
    label: string;
    status: string;
    count?: number | null;
    latest_at?: string | null;
    stale?: boolean;
  }>;
  events: Array<{
    id: string;
    at: string | null;
    type: string;
    title: string;
    detail: string | null;
    actor?: string | null;
    from_status?: string | null;
    to_status?: string | null;
  }>;
  connection: { mode: string; label: string; sensor_connected: boolean };
  limits: string[];
};
export type TwinCapture = {
  id: string;
  recorded_at: string;
  recorded_by: string;
  horometer: TwinState["horometer"];
  condition: TwinCondition;
  identity: TwinState["identity"];
};
export type TwinSimulationInput = {
  days: number;
  hours_per_day: number;
  downtime_hours: number;
  rate_mode?: "MANUAL" | "HISTORICAL";
  include_possible?: boolean;
};
export type TwinCalibration = {
  hours_per_day: number | null;
  samples: number;
  rejected: number;
  observed_days: number;
  from: string | null;
  to: string | null;
  stale: boolean;
  source: string;
};
export type TwinSimulation = {
  assumptions: TwinSimulationInput;
  basis_at: string;
  start: number;
  added_hours: number;
  projected_horometer: number;
  target: number | null;
  remaining: number | null;
  exceeds_target: boolean | null;
  target_reliable: boolean;
  points: Array<{ day: number; horometer: number }>;
  explanation: string;
  next_target: number | null;
  remaining_after_services: number | null;
  target_reached: boolean;
  calibration: TwinCalibration;
  history: {
    window_days: number;
    closed_orders: number;
    valid_durations: number;
    rejected_durations: number;
    recent: Array<{
      code: string;
      title: string;
      kind: string;
      hours: number;
      basis: string;
      closed_at: string | null;
    }>;
  };
  interventions: Array<{
    id: string;
    code: string;
    title: string;
    category: "OT_REGISTRADA" | "PROGRAMADA" | "MPG_PROYECTADO";
    at: string | null;
    end_at: string | null;
    status: string;
    duration_hours: number | null;
    duration_basis: string;
    samples: number;
    range: [number, number] | null;
    reference_codes: string[];
    requires_stop: boolean | null;
    included: boolean;
    overdue: boolean;
    target: number | null;
  }>;
  scheduled_count: number;
  possible_count: number;
  operation_lost_hours: number;
  warnings: string[];
};
export type TwinEquipmentOption = {
  id: string;
  codigo: string;
  nombre: string;
  nombre_real?: string;
  modelo?: string;
  serie?: string;
  marca_nombre?: string;
};
