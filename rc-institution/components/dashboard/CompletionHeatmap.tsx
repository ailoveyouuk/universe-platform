import type { Cohort, Student } from '@/lib/data/types'

const SM_LABELS = [
  { id: 1, slug: 'sm1' }, { id: 2, slug: 'sm2' }, { id: 3, slug: 'sm3' },
  { id: 4, slug: 'sm4' }, { id: 5, slug: 'sm5' }, { id: 6, slug: 'sm6' },
  { id: 7, slug: 'sm7' }, { id: 8, slug: 'sm8' }, { id: 9, slug: 'sm9' },
  { id: 10, slug: 'sm10' }, { id: 11, slug: 'sm11' }, { id: 12, slug: 'sm12' },
  { id: 13, slug: 'sm13' }, { id: 14, slug: 'sm14' }, { id: 15, slug: 'sm15' },
]

function pctToColor(pct: number): string {
  if (pct === 0)  return '#f1f5f9'
  if (pct < 25)   return '#dcfce7'
  if (pct < 50)   return '#86efac'
  if (pct < 75)   return '#4ade80'
  return '#16a34a'
}

interface CompletionHeatmapProps {
  cohorts: Cohort[]
  students: Student[]
}

export function CompletionHeatmap({ cohorts, students }: CompletionHeatmapProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-inst-slate text-sm">SM Completion by Cohort</h3>
        {cohorts.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>0%</span>
            {['#dcfce7','#86efac','#4ade80','#16a34a'].map(c => (
              <span key={c} className="w-4 h-3 rounded-sm inline-block" style={{ background: c }} />
            ))}
            <span>100%</span>
          </div>
        )}
      </div>
      {cohorts.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-500">No cohort data yet — the heatmap will populate once cohorts and students are added.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left text-slate-500 font-medium pb-2 pr-2 w-12">SM</th>
                {cohorts.map(c => (
                  <th key={c.id} className="text-center text-slate-500 font-medium pb-2 px-1 whitespace-nowrap">{c.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SM_LABELS.map(sm => (
                <tr key={sm.id}>
                  <td className="py-0.5 pr-2 text-slate-500 font-medium">SM{sm.id}</td>
                  {cohorts.map(cohort => {
                    const cohortStudents = students.filter(s => s.cohortId === cohort.id)
                    const completed = cohortStudents.filter(s => s.smProgress[sm.slug]?.status === 'completed').length
                    const pct = cohortStudents.length > 0 ? Math.round((completed / cohortStudents.length) * 100) : 0
                    return (
                      <td key={cohort.id} className="py-0.5 px-1 text-center">
                        <div
                          className="w-full h-6 rounded flex items-center justify-center text-xs font-medium transition-opacity hover:opacity-80 cursor-default"
                          style={{ background: pctToColor(pct), color: pct >= 50 ? '#fff' : '#475569' }}
                          title={`${cohort.name} — SM${sm.id}: ${pct}% complete (${completed}/${cohortStudents.length})`}
                        >
                          {pct > 0 ? `${pct}%` : ''}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
