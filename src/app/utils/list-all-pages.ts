import { cachedGet } from "@/app/utils/request-cache";

// Las pantallas que necesitan el catalogo completo lo bajaban de 100 en 100 y
// una pagina detras de otra: con 3.600 filas de stock eran 37 viajes seguidos y
// cada viaje cuesta la ida y vuelta de red aunque el servidor responda en
// milisegundos. Ahora se piden paginas grandes y, sabiendo el total por la
// primera, el resto sale en paralelo con un tope de concurrencia.
const BULK_PAGE_SIZE = 1000;
const LEGACY_PAGE_SIZE = 100;
const PARALLEL_PAGE_REQUESTS = 4;

function asArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.records)) return data.records;
  return [];
}

function getPaginationMeta(data: any) {
  return data?.pagination ?? data?.meta ?? null;
}

function getPageFingerprint(rows: any[]) {
  return rows
    .map((row) => row?.id ?? row?.codigo ?? JSON.stringify(row))
    .join("|")
    .slice(0, 8000);
}

function isValidationRejection(error: any) {
  return Number(error?.response?.status) === 400;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length)) },
    async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await worker(items[index] as T);
      }
    },
  );
  await Promise.all(runners);
  return results;
}

export async function listAllPages(
  endpoint: string,
  params: Record<string, any> = {},
  options?: { limit?: number; maxPages?: number; cacheTtlMs?: number },
) {
  const maxPages = Number(options?.maxPages ?? 100);
  const ttlMs = Number(options?.cacheTtlMs ?? 0);
  const fetchPage = async (page: number, limit: number) => {
    const { data } = await cachedGet(
      endpoint,
      { params: { page, limit, ...params } },
      { ttlMs },
    );
    return data;
  };

  // Un limite pedido menor que el bloque grande venia del tope viejo de 100
  // del servidor; quien llama a esta funcion siempre quiere todas las filas.
  let limit = Math.max(Number(options?.limit ?? 0) || 0, BULK_PAGE_SIZE);
  let firstData: any;
  try {
    firstData = await fetchPage(1, limit);
  } catch (error) {
    // Un servicio que todavia valida `limit <= 100` responde 400: se repite con
    // el tamano que si acepta en vez de dejar la pantalla vacia.
    if (!isValidationRejection(error) || limit <= LEGACY_PAGE_SIZE) throw error;
    limit = LEGACY_PAGE_SIZE;
    firstData = await fetchPage(1, limit);
  }

  const firstRows = asArray(firstData);
  const pagination = getPaginationMeta(firstData);
  if (!pagination) {
    return firstRows;
  }

  const out: any[] = [];
  const seenIds = new Set<string>();
  const pushRows = (rows: any[]) => {
    for (const row of rows) {
      const id = String(row?.id ?? "");
      if (id) {
        if (seenIds.has(id)) continue;
        seenIds.add(id);
      }
      out.push(row);
    }
  };
  pushRows(firstRows);

  const total = Number(
    pagination?.total ?? pagination?.count ?? pagination?.totalItems ?? 0,
  );
  // El servidor puede recortar el limite pedido: el tamano real de pagina es el
  // que informa, o el de las filas que devolvio si no hay mas paginas que esa.
  const effectiveLimit =
    Number(pagination?.limit) > 0
      ? Number(pagination.limit)
      : firstRows.length > 0 && total > firstRows.length
        ? firstRows.length
        : limit;
  let totalPages = Number(
    pagination?.totalPages ?? pagination?.pages ?? pagination?.pageCount ?? 0,
  );
  if (!(totalPages > 0) && total > 0 && effectiveLimit > 0) {
    totalPages = Math.ceil(total / effectiveLimit);
  }

  if (totalPages > 0) {
    const lastPage = Math.min(totalPages, maxPages);
    const pending = Array.from(
      { length: Math.max(0, lastPage - 1) },
      (_, index) => index + 2,
    );
    const pages = await mapWithConcurrency(
      pending,
      PARALLEL_PAGE_REQUESTS,
      async (page) => asArray(await fetchPage(page, limit)),
    );
    pages.forEach(pushRows);
    return out;
  }

  // Sin total conocido no se puede repartir: se sigue pagina a pagina hasta que
  // el servidor deje de devolver filas nuevas.
  const seenFingerprints = new Set<string>();
  const firstFingerprint = getPageFingerprint(firstRows);
  if (firstFingerprint) seenFingerprints.add(firstFingerprint);
  if (!firstRows.length) return out;
  for (let page = 2; page <= maxPages; page += 1) {
    const rows = asArray(await fetchPage(page, limit));
    const fingerprint = getPageFingerprint(rows);
    if (!rows.length) break;
    if (fingerprint && seenFingerprints.has(fingerprint)) break;
    if (fingerprint) seenFingerprints.add(fingerprint);
    pushRows(rows);
  }

  return out;
}
