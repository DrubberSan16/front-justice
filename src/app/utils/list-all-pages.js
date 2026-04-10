import { api } from "@/app/http/api";
function asArray(data) {
    if (Array.isArray(data))
        return data;
    if (Array.isArray(data?.items))
        return data.items;
    if (Array.isArray(data?.data))
        return data.data;
    if (Array.isArray(data?.results))
        return data.results;
    if (Array.isArray(data?.records))
        return data.records;
    return [];
}
function getPaginationMeta(data) {
    return data?.pagination ?? data?.meta ?? null;
}
function getPageFingerprint(rows) {
    return rows
        .map((row) => row?.id ?? row?.codigo ?? JSON.stringify(row))
        .join("|")
        .slice(0, 8000);
}
export async function listAllPages(endpoint, params = {}, options) {
    const out = [];
    const limit = Number(options?.limit ?? 100);
    const maxPages = Number(options?.maxPages ?? 100);
    const seenFingerprints = new Set();
    const seenIds = new Set();
    for (let page = 1; page <= maxPages; page += 1) {
        const { data } = await api.get(endpoint, { params: { page, limit, ...params } });
        const rows = asArray(data);
        const pagination = getPaginationMeta(data);
        const totalPages = Number(pagination?.totalPages ?? pagination?.pages ?? pagination?.pageCount ?? 0);
        const total = Number(pagination?.total ?? pagination?.count ?? pagination?.totalItems ?? 0);
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
                if (seenIds.has(id))
                    continue;
                seenIds.add(id);
            }
            out.push(row);
        }
        if (totalPages > 0 && page >= totalPages)
            break;
        if (total > 0 && out.length >= total)
            break;
        if (!pagination && (!rows.length || rows.length < limit))
            break;
        if (pagination && !rows.length)
            break;
    }
    return out;
}
