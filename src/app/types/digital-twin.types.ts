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
export type TwinSimulation = {
  assumptions: { days: number; hours_per_day: number; downtime_hours: number };
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
