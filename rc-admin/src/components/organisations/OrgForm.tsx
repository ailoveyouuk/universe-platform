'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOrganisation, updateOrganisation, createOpportunity, updateOpportunity, deleteOpportunity } from '@/lib/api/adminApi'
import type { Organisation, Opportunity } from '@/lib/data/types'

interface OrgFormProps {
  initial?: Partial<Organisation>
  mode: 'create' | 'edit'
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const TIER_OPTIONS = [
  { value: 'STANDARD',         label: 'Standard' },
  { value: 'PARTNER',          label: 'Partner' },
  { value: 'GOLD_PARTNER',     label: 'Gold Partner' },
  { value: 'PLATINUM_PARTNER', label: 'Platinum Partner' },
]

type FormData = {
  slug:            string
  type:            'EMPLOYER' | 'INSTITUTION'
  name:            string
  logoUrl:         string
  brandColour:     string
  country:         string
  city:            string
  website:         string
  tagline:         string
  overview:        string
  heroImageUrl:    string
  videoUrl:        string
  galleryImages:   string[]
  sectors:         string[]
  yearFounded:     string
  employeeCount:   string
  partnershipTier: 'STANDARD' | 'PARTNER' | 'GOLD_PARTNER' | 'PLATINUM_PARTNER'
  isPublished:     boolean
  rcContactId:     string
  socialTwitter:   string
  socialLinkedIn:  string
  socialInstagram: string
  socialFacebook:  string
  socialYoutube:   string
  testimonialQuote:      string
  testimonialAuthorName: string
  testimonialAuthorRole: string
}

function initForm(org?: Partial<Organisation>): FormData {
  const s = (org?.socialLinks ?? {}) as Record<string, string>
  const t = (org?.testimonial ?? {}) as Record<string, string>
  return {
    slug:            org?.slug            ?? '',
    type:            org?.type            ?? 'EMPLOYER',
    name:            org?.name            ?? '',
    logoUrl:         org?.logoUrl         ?? '',
    brandColour:     org?.brandColour     ?? '#82BC00',
    country:         org?.country         ?? '',
    city:            org?.city            ?? '',
    website:         org?.website         ?? '',
    tagline:         org?.tagline         ?? '',
    overview:        org?.overview        ?? '',
    heroImageUrl:    org?.heroImageUrl    ?? '',
    videoUrl:        org?.videoUrl        ?? '',
    galleryImages:   org?.galleryImages   ?? [],
    sectors:         org?.sectors         ?? [],
    yearFounded:     org?.yearFounded     != null ? String(org.yearFounded) : '',
    employeeCount:   org?.employeeCount   ?? '',
    partnershipTier: org?.partnershipTier ?? 'STANDARD',
    isPublished:     org?.isPublished     ?? false,
    rcContactId:     org?.rcContactId     ?? '',
    socialTwitter:   s['twitter']         ?? '',
    socialLinkedIn:  s['linkedin']        ?? '',
    socialInstagram: s['instagram']       ?? '',
    socialFacebook:  s['facebook']        ?? '',
    socialYoutube:   s['youtube']         ?? '',
    testimonialQuote:      t['quote']      ?? '',
    testimonialAuthorName: t['authorName'] ?? '',
    testimonialAuthorRole: t['authorRole'] ?? '',
  }
}

export function OrgForm({ initial, mode }: OrgFormProps) {
  const router              = useRouter()
  const [form, setForm]     = useState<FormData>(initForm(initial))
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const [newGalleryUrl, setNewGalleryUrl] = useState('')
  const [newSector, setNewSector]         = useState('')

  const [opps, setOpps]       = useState<Opportunity[]>(initial?.opportunities ?? [])
  const [newOppTitle, setNewOppTitle]       = useState('')
  const [newOppType, setNewOppType]         = useState('')
  const [newOppDesc, setNewOppDesc]         = useState('')
  const [newOppUrl, setNewOppUrl]           = useState('')
  const [addingOpp, setAddingOpp]           = useState(false)

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleNameChange(name: string) {
    setForm(prev => ({ ...prev, name, slug: mode === 'create' ? slugify(name) : prev.slug }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload: Partial<Organisation> = {
      slug:            form.slug,
      type:            form.type,
      name:            form.name,
      logoUrl:         form.logoUrl         || null,
      brandColour:     form.brandColour     || null,
      country:         form.country         || null,
      city:            form.city            || null,
      website:         form.website         || null,
      tagline:         form.tagline         || null,
      overview:        form.overview        || null,
      heroImageUrl:    form.heroImageUrl    || null,
      videoUrl:        form.videoUrl        || null,
      galleryImages:   form.galleryImages,
      sectors:         form.sectors,
      yearFounded:     form.yearFounded ? parseInt(form.yearFounded, 10) : null,
      employeeCount:   form.employeeCount   || null,
      partnershipTier: form.partnershipTier,
      isPublished:     form.isPublished,
      rcContactId:     form.rcContactId     || null,
      socialLinks:     {
        ...(form.socialTwitter   && { twitter:   form.socialTwitter }),
        ...(form.socialLinkedIn  && { linkedin:  form.socialLinkedIn }),
        ...(form.socialInstagram && { instagram: form.socialInstagram }),
        ...(form.socialFacebook  && { facebook:  form.socialFacebook }),
        ...(form.socialYoutube   && { youtube:   form.socialYoutube }),
      },
      ...(form.testimonialQuote && {
        testimonial: {
          quote:      form.testimonialQuote,
          authorName: form.testimonialAuthorName,
          authorRole: form.testimonialAuthorRole,
        },
      }),
    }

    const result = mode === 'create'
      ? await createOrganisation(payload)
      : await updateOrganisation(initial!.id!, payload)

    if (!result) {
      setError('Failed to save. Please try again.')
      setSaving(false)
      return
    }

    router.push('/organisations')
  }

  async function handleAddOpp() {
    if (!newOppTitle || !initial?.id) return
    setAddingOpp(true)
    const opp = await createOpportunity(initial.id, {
      title:       newOppTitle,
      type:        newOppType  || undefined,
      description: newOppDesc  || undefined,
      url:         newOppUrl   || undefined,
    })
    if (opp) {
      setOpps(prev => [...prev, opp])
      setNewOppTitle(''); setNewOppType(''); setNewOppDesc(''); setNewOppUrl('')
    }
    setAddingOpp(false)
  }

  async function handleDeleteOpp(oppId: string) {
    if (!initial?.id) return
    await deleteOpportunity(initial.id, oppId)
    setOpps(prev => prev.filter(o => o.id !== oppId))
  }

  async function handleToggleOpp(opp: Opportunity) {
    if (!initial?.id) return
    await updateOpportunity(initial.id, opp.id, { isActive: !opp.isActive })
    setOpps(prev => prev.map(o => o.id === opp.id ? { ...o, isActive: !opp.isActive } : o))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {/* ── Core identity ────────────────────────────────────────────────────── */}
      <Section title="Core identity">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Organisation name" required>
            <input type="text" value={form.name} onChange={e => handleNameChange(e.target.value)}
              required className="field-input" placeholder="e.g. myenergi" />
          </Field>
          <Field label="Slug (URL path)" required>
            <input type="text" value={form.slug} onChange={e => set('slug', e.target.value)}
              required className="field-input" placeholder="e.g. myenergi" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <select value={form.type} onChange={e => set('type', e.target.value as 'EMPLOYER' | 'INSTITUTION')} className="field-input">
              <option value="EMPLOYER">Employer</option>
              <option value="INSTITUTION">Institution</option>
            </select>
          </Field>
          <Field label="Partnership tier">
            <select value={form.partnershipTier} onChange={e => set('partnershipTier', e.target.value as FormData['partnershipTier'])} className="field-input">
              {TIER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Brand colour (hex)">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg border border-rc-border flex-shrink-0" style={{ background: form.brandColour || '#82BC00' }} />
              <input type="text" value={form.brandColour} onChange={e => set('brandColour', e.target.value)}
                className="field-input" placeholder="#82BC00" />
            </div>
          </Field>
          <Field label="Logo URL">
            <input type="url" value={form.logoUrl} onChange={e => set('logoUrl', e.target.value)}
              className="field-input" placeholder="https://..." />
          </Field>
          <Field label="Website">
            <input type="url" value={form.website} onChange={e => set('website', e.target.value)}
              className="field-input" placeholder="https://..." />
          </Field>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <input type="checkbox" id="isPublished" checked={form.isPublished} onChange={e => set('isPublished', e.target.checked)}
            className="w-4 h-4 rounded accent-rc-green" />
          <label htmlFor="isPublished" className="text-sm text-adm-ink font-medium">Published (visible on /partners)</label>
        </div>
      </Section>

      {/* ── Location ─────────────────────────────────────────────────────────── */}
      <Section title="Location">
        <div className="grid grid-cols-2 gap-4">
          <Field label="City">
            <input type="text" value={form.city} onChange={e => set('city', e.target.value)}
              className="field-input" placeholder="e.g. Grimsby" />
          </Field>
          <Field label="Country">
            <input type="text" value={form.country} onChange={e => set('country', e.target.value)}
              className="field-input" placeholder="e.g. United Kingdom" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Year founded">
            <input type="number" value={form.yearFounded} onChange={e => set('yearFounded', e.target.value)}
              className="field-input" placeholder="e.g. 2016" min={1800} max={2099} />
          </Field>
          <Field label="Employee count">
            <input type="text" value={form.employeeCount} onChange={e => set('employeeCount', e.target.value)}
              className="field-input" placeholder="e.g. 400+" />
          </Field>
        </div>
      </Section>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <Section title="Profile content">
        <Field label="Tagline">
          <input type="text" value={form.tagline} onChange={e => set('tagline', e.target.value)}
            className="field-input" placeholder="Short punchy description (shown on cards)" />
        </Field>
        <Field label="Overview (markdown supported)">
          <textarea value={form.overview} onChange={e => set('overview', e.target.value)}
            rows={8} className="field-input resize-none font-mono text-xs"
            placeholder="Full organisation description — supports line breaks and paragraphs" />
        </Field>
        <Field label="Hero image URL">
          <input type="url" value={form.heroImageUrl} onChange={e => set('heroImageUrl', e.target.value)}
            className="field-input" placeholder="https://... (shown as full-width background)" />
        </Field>
        <Field label="Video URL (YouTube/Vimeo embed)">
          <input type="url" value={form.videoUrl} onChange={e => set('videoUrl', e.target.value)}
            className="field-input" placeholder="https://www.youtube.com/embed/..." />
        </Field>
      </Section>

      {/* ── Sectors ──────────────────────────────────────────────────────────── */}
      <Section title="Sectors">
        <div className="flex gap-2 mb-3">
          <input type="text" value={newSector} onChange={e => setNewSector(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newSector.trim()) { set('sectors', [...form.sectors, newSector.trim()]); setNewSector('') } } }}
            className="field-input flex-1" placeholder="Type a sector and press Enter" />
          <button type="button" onClick={() => { if (newSector.trim()) { set('sectors', [...form.sectors, newSector.trim()]); setNewSector('') } }}
            className="px-4 py-2 bg-adm-page border border-adm-border rounded-lg text-sm text-adm-ink hover:bg-rc-green hover:text-white hover:border-rc-green transition-colors">
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {form.sectors.map(s => (
            <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rc-green/10 text-rc-green-600">
              {s}
              <button type="button" onClick={() => set('sectors', form.sectors.filter(x => x !== s))}
                className="hover:text-red-500 transition-colors">×</button>
            </span>
          ))}
        </div>
      </Section>

      {/* ── Gallery ──────────────────────────────────────────────────────────── */}
      <Section title="Gallery images">
        <div className="flex gap-2 mb-3">
          <input type="url" value={newGalleryUrl} onChange={e => setNewGalleryUrl(e.target.value)}
            className="field-input flex-1" placeholder="Image URL (https://...)" />
          <button type="button" onClick={() => { if (newGalleryUrl.trim()) { set('galleryImages', [...form.galleryImages, newGalleryUrl.trim()]); setNewGalleryUrl('') } }}
            className="px-4 py-2 bg-adm-page border border-adm-border rounded-lg text-sm text-adm-ink hover:bg-rc-green hover:text-white hover:border-rc-green transition-colors">
            Add
          </button>
        </div>
        <div className="space-y-2">
          {form.galleryImages.map((url, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 bg-adm-page rounded-lg">
              <span className="text-adm-ink-muted text-xs w-4">{i + 1}</span>
              <span className="text-xs text-adm-ink flex-1 truncate">{url}</span>
              <button type="button" onClick={() => set('galleryImages', form.galleryImages.filter((_, j) => j !== i))}
                className="text-red-400 hover:text-red-600 text-xs">×</button>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Social links ─────────────────────────────────────────────────────── */}
      <Section title="Social links">
        <div className="grid grid-cols-2 gap-4">
          {([['socialLinkedIn', 'LinkedIn'], ['socialTwitter', 'X / Twitter'], ['socialInstagram', 'Instagram'], ['socialFacebook', 'Facebook'], ['socialYoutube', 'YouTube']] as const).map(([key, label]) => (
            <Field key={key} label={label}>
              <input type="url" value={form[key]} onChange={e => set(key, e.target.value)}
                className="field-input" placeholder="https://..." />
            </Field>
          ))}
        </div>
      </Section>

      {/* ── Testimonial ──────────────────────────────────────────────────────── */}
      <Section title="Testimonial">
        <Field label="Quote">
          <textarea value={form.testimonialQuote} onChange={e => set('testimonialQuote', e.target.value)}
            rows={3} className="field-input resize-none" placeholder="Their words…" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Author name">
            <input type="text" value={form.testimonialAuthorName} onChange={e => set('testimonialAuthorName', e.target.value)}
              className="field-input" placeholder="e.g. Lee Sutton" />
          </Field>
          <Field label="Author role">
            <input type="text" value={form.testimonialAuthorRole} onChange={e => set('testimonialAuthorRole', e.target.value)}
              className="field-input" placeholder="e.g. Co-Founder, myenergi" />
          </Field>
        </div>
      </Section>

      {/* ── Admin fields ─────────────────────────────────────────────────────── */}
      <Section title="Admin settings">
        <Field label="RC Contact user ID">
          <input type="text" value={form.rcContactId} onChange={e => set('rcContactId', e.target.value)}
            className="field-input" placeholder="User cuid from database" />
        </Field>
      </Section>

      {/* ── Opportunities (edit-mode only) ───────────────────────────────────── */}
      {mode === 'edit' && (
        <Section title="Opportunities">
          <div className="space-y-3 mb-4">
            {opps.map(opp => (
              <div key={opp.id} className="flex items-start gap-3 p-3 bg-adm-page rounded-lg border border-adm-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-adm-ink truncate">{opp.title}</p>
                    {opp.type && <span className="text-xs text-adm-ink-muted">({opp.type})</span>}
                  </div>
                  {opp.url && <p className="text-xs text-rc-green truncate">{opp.url}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button type="button" onClick={() => handleToggleOpp(opp)}
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-colors ${opp.isActive ? 'bg-rc-green/10 text-rc-green-600' : 'bg-slate-100 text-slate-500'}`}>
                    {opp.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button type="button" onClick={() => handleDeleteOpp(opp.id)}
                    className="text-xs text-red-400 hover:text-red-600">Delete</button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-adm-page border border-adm-border rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-adm-ink-muted uppercase tracking-wider">Add opportunity</p>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={newOppTitle} onChange={e => setNewOppTitle(e.target.value)}
                className="field-input" placeholder="Title *" />
              <input type="text" value={newOppType} onChange={e => setNewOppType(e.target.value)}
                className="field-input" placeholder="Type (e.g. Graduate Programme)" />
            </div>
            <textarea value={newOppDesc} onChange={e => setNewOppDesc(e.target.value)}
              rows={2} className="field-input w-full resize-none" placeholder="Brief description" />
            <div className="flex gap-3">
              <input type="url" value={newOppUrl} onChange={e => setNewOppUrl(e.target.value)}
                className="field-input flex-1" placeholder="Apply / info URL" />
              <button type="button" onClick={handleAddOpp} disabled={addingOpp || !newOppTitle}
                className="px-4 py-2 bg-rc-green text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
                {addingOpp ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        </Section>
      )}

      {/* ── Actions ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="px-6 py-2.5 bg-rc-green text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity">
          {saving ? 'Saving…' : mode === 'create' ? 'Create organisation' : 'Save changes'}
        </button>
        <button type="button" onClick={() => router.push('/organisations')}
          className="px-6 py-2.5 text-sm text-adm-ink-muted hover:text-adm-ink transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h3 className="font-heading font-bold text-adm-ink text-sm mb-4 pb-3 border-b border-adm-border">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-adm-ink-muted mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
