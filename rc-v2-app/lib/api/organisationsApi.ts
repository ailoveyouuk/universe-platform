import type { Organisation, OrganisationListItem } from '@rc/types'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

async function publicGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json() as { data: T; error: null }
    return json.data
  } catch {
    return null
  }
}

export interface OrgListResponse {
  orgs: OrganisationListItem[]
  pagination: { total: number; page: number; limit: number; pages: number }
}

export async function getOrganisations(params?: {
  type?: 'EMPLOYER' | 'INSTITUTION'
  sector?: string
  page?: number
}): Promise<OrgListResponse> {
  const qs = new URLSearchParams()
  if (params?.type)   qs.set('type',   params.type)
  if (params?.sector) qs.set('sector', params.sector)
  if (params?.page)   qs.set('page',   String(params.page))

  const result = await publicGet<OrgListResponse>(
    `/api/organisations${qs.toString() ? `?${qs}` : ''}`,
  )

  return result ?? { orgs: [], pagination: { total: 0, page: 1, limit: 24, pages: 0 } }
}

export async function getOrganisationBySlug(slug: string): Promise<Organisation | null> {
  return publicGet<Organisation>(`/api/organisations/${slug}`)
}
