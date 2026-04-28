import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { api } from "@/app/http/api";

type CacheEntry = {
  expiresAt: number;
  response: AxiosResponse<any>;
};

type RequestCacheMatcher = string | RegExp | ((key: string) => boolean);

const responseCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<AxiosResponse<any>>>();

export const DEFAULT_CONTEXT_CACHE_TTL_MS = 30_000;
export const DEFAULT_CATALOG_CACHE_TTL_MS = 60_000;

function stableSerialize(value: unknown): string {
  if (value == null) return "null";

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function matchesCacheKey(key: string, matcher: RequestCacheMatcher) {
  if (typeof matcher === "string") return key.includes(matcher);
  if (matcher instanceof RegExp) return matcher.test(key);
  return matcher(key);
}

export function buildGetCacheKey(url: string, params?: unknown) {
  return `GET:${url}?${stableSerialize(params ?? null)}`;
}

export async function cachedGet<T = any>(
  url: string,
  config: AxiosRequestConfig = {},
  options?: {
    ttlMs?: number;
    cacheKey?: string;
  },
) {
  const ttlMs = Math.max(0, Number(options?.ttlMs ?? 0));
  const cacheKey = options?.cacheKey ?? buildGetCacheKey(url, config.params);
  const now = Date.now();
  const cached = responseCache.get(cacheKey);

  if (ttlMs > 0 && cached && cached.expiresAt > now) {
    return cached.response as AxiosResponse<T>;
  }

  const activeRequest = inflightRequests.get(cacheKey);
  if (activeRequest) {
    return activeRequest as Promise<AxiosResponse<T>>;
  }

  const request = api
    .get<T>(url, config)
    .then((response) => {
      if (ttlMs > 0) {
        responseCache.set(cacheKey, {
          expiresAt: Date.now() + ttlMs,
          response,
        });
      }
      return response;
    })
    .finally(() => {
      if (inflightRequests.get(cacheKey) === request) {
        inflightRequests.delete(cacheKey);
      }
    });

  inflightRequests.set(cacheKey, request as Promise<AxiosResponse<any>>);

  return request;
}

export function invalidateRequestCache(matchers?: RequestCacheMatcher | RequestCacheMatcher[]) {
  if (!matchers) {
    responseCache.clear();
    return;
  }

  const normalized = Array.isArray(matchers) ? matchers : [matchers];

  for (const key of responseCache.keys()) {
    if (normalized.some((matcher) => matchesCacheKey(key, matcher))) {
      responseCache.delete(key);
    }
  }
}
