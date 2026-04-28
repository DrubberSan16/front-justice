import { cachedGet } from "@/app/utils/request-cache";

export function asArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.records)) return data.records;
  return [];
}

export function getPaginationMeta(data: any) {
  return data?.pagination ?? data?.meta ?? null;
}

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

export async function fetchPaginatedResource(
  endpoint: string,
  params: Record<string, any> = {},
  options?: {
    page?: number;
    limit?: number;
    cacheTtlMs?: number;
  },
) {
  const page = toPositiveInteger(options?.page, 1);
  const limit = Math.min(100, toPositiveInteger(options?.limit, 20));
  const requestParams = {
    ...params,
    page,
    limit,
  };
  const { data } = await cachedGet(
    endpoint,
    { params: requestParams },
    { ttlMs: Number(options?.cacheTtlMs ?? 0) },
  );

  const rows = asArray(data);
  const pagination = getPaginationMeta(data);
  const total = Number(
    pagination?.total ??
      pagination?.count ??
      pagination?.totalItems ??
      rows.length,
  );
  const totalPages = Number(
    pagination?.totalPages ??
      pagination?.pages ??
      pagination?.pageCount ??
      (limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1),
  );

  return {
    data: rows,
    pagination: {
      page: Number(pagination?.page ?? page),
      limit: Number(pagination?.limit ?? limit),
      total,
      totalPages: Math.max(1, totalPages || 1),
    },
    raw: data,
  };
}
