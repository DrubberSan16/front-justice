import { cachedGet } from "@/app/utils/request-cache";

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

export async function listAllPages(
  endpoint: string,
  params: Record<string, any> = {},
  options?: { limit?: number; maxPages?: number; cacheTtlMs?: number },
) {
  const out: any[] = [];
  const limit = Number(options?.limit ?? 100);
  const maxPages = Number(options?.maxPages ?? 100);
  const seenFingerprints = new Set<string>();
  const seenIds = new Set<string>();

  for (let page = 1; page <= maxPages; page += 1) {
    const requestParams = { page, limit, ...params };
    const { data } = await cachedGet(
      endpoint,
      { params: requestParams },
      { ttlMs: Number(options?.cacheTtlMs ?? 0) },
    );
    const rows = asArray(data);
    const pagination = getPaginationMeta(data);
    const totalPages = Number(
      pagination?.totalPages ?? pagination?.pages ?? pagination?.pageCount ?? 0,
    );
    const total = Number(
      pagination?.total ?? pagination?.count ?? pagination?.totalItems ?? 0,
    );

    if (page === 1 && !pagination) {
      return rows;
    }

    const fingerprint = getPageFingerprint(rows);
    if (fingerprint && seenFingerprints.has(fingerprint)) {
      break;
    }
    if (fingerprint) {
      seenFingerprints.add(fingerprint);
    }

    for (const row of rows) {
      const id = String(row?.id ?? "");
      if (id) {
        if (seenIds.has(id)) continue;
        seenIds.add(id);
      }
      out.push(row);
    }
    if (totalPages > 0 && page >= totalPages) break;
    if (total > 0 && out.length >= total) break;
    if (!pagination && (!rows.length || rows.length < limit)) break;
    if (pagination && !rows.length) break;
  }

  return out;
}
