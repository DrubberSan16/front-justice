import { api } from "@/app/http/api";
export async function createLogTransact(body) {
    try {
        const { data } = await api.post("/kpi_security/log-transacts", body);
        // intentamos detectar id (por si el backend devuelve objeto completo)
        const ticket = data?.id ??
            data?.log?.id ??
            data?.data?.id ??
            null;
        return ticket;
    }
    catch {
        // si falla el log, no bloqueamos al usuario
        return null;
    }
}
