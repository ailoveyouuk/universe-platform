import type { ApiResult, ApiError } from '@rc/types'

let _baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
let _getToken: (() => Promise<string | null>) | null = null

export function configureApiClient(options: {
  baseUrl: string
  getToken?: () => Promise<string | null>
}) {
  _baseUrl = options.baseUrl.replace(/\/$/, '')
  _getToken = options.getToken ?? null
}

async function rcFetch<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  // Only set Content-Type when there's actually a body to parse — a bodyless
  // DELETE (every one in this codebase) sent with 'application/json' set
  // anyway used to hit Fastify's default JSON parser, which rejects an empty
  // body under that content-type with FST_ERR_CTP_EMPTY_JSON_BODY. Every
  // apiDelete() call in every app was silently failing with a bare "HTTP
  // 400" until this was scoped to only apply when we're sending JSON.
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (_getToken) {
    const token = await _getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const res = await fetch(`${_baseUrl}${path}`, {
      method,
      headers,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    })

    const json = await res.json()

    if (!res.ok) {
      return {
        data: null,
        error: {
          code:       json?.error?.code    ?? 'HTTP_ERROR',
          message:    json?.error?.message ?? `HTTP ${res.status}`,
          statusCode: res.status,
        },
      }
    }

    return { data: json.data as T, error: null }
  } catch (err) {
    return {
      data: null,
      error: {
        code:       'NETWORK_ERROR',
        message:    err instanceof Error ? err.message : 'Network error',
        statusCode: 0,
      },
    }
  }
}

export function apiGet<T>(path: string): Promise<ApiResult<T>> {
  return rcFetch<T>('GET', path)
}

export function apiPost<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  return rcFetch<T>('POST', path, body)
}

export function apiPatch<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  return rcFetch<T>('PATCH', path, body)
}

export function apiDelete<T>(path: string): Promise<ApiResult<T>> {
  return rcFetch<T>('DELETE', path)
}

export function isApiError<T>(result: ApiResult<T>): result is ApiError {
  return result.error !== null
}

// ── File download helper ──────────────────────────────────────────────────────
// Distinct from rcFetch above because it never parses the response as JSON —
// used for endpoints that return a raw file (CSV/XLSX exports) rather than
// the usual {data, error} envelope. Kept file-format-agnostic: the caller
// gets the Blob and a filename (from Content-Disposition, when the server
// sets one) and decides what to do with it — trigger a browser download,
// hand it to a native file-save flow, etc.
export interface BlobDownloadResult {
  blob: Blob
  filename: string | null
}
export interface BlobDownloadError {
  error: { code: string; message: string; statusCode: number }
}

export async function apiPostForBlob(
  path: string,
  body: unknown,
): Promise<BlobDownloadResult | BlobDownloadError> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (_getToken) {
    const token = await _getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const res = await fetch(`${_baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      let message = `HTTP ${res.status}`
      let code = 'HTTP_ERROR'
      try {
        const json = await res.json()
        message = json?.error?.message ?? message
        code = json?.error?.code ?? code
      } catch { /* non-JSON error body — keep the generic message above */ }
      return { error: { code, message, statusCode: res.status } }
    }

    const blob = await res.blob()
    const disposition = res.headers.get('Content-Disposition') ?? ''
    const match = disposition.match(/filename="?([^";]+)"?/)
    return { blob, filename: match ? match[1] : null }
  } catch (err) {
    return {
      error: {
        code:       'NETWORK_ERROR',
        message:    err instanceof Error ? err.message : 'Network error',
        statusCode: 0,
      },
    }
  }
}

export function isBlobDownloadError(
  result: BlobDownloadResult | BlobDownloadError,
): result is BlobDownloadError {
  return 'error' in result
}
