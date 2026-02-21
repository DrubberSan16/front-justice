import { api } from "@/app/http/api";

export type CreateLogTransactBody = {
  moduleMicroservice: string; // "kpi_security"
  status: "ACTIVE" | "INACTIVE" | string;
  typeLog: string;           // "USER_CREATE", "USER_UPDATE", ...
  description: string;       // detalle del error
  createdBy: string;         // usuario logueado
};

export async function createLogTransact(body: CreateLogTransactBody): Promise<string | null> {
  try {
    const { data } = await api.post<any>("/kpi_security/log-transacts", body);

    // intentamos detectar id (por si el backend devuelve objeto completo)
    const ticket =
      data?.id ??
      data?.log?.id ??
      data?.data?.id ??
      null;

    return ticket;
  } catch {
    // si falla el log, no bloqueamos al usuario
    return null;
  }
}