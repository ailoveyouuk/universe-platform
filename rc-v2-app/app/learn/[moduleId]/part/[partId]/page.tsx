// Server component — exports generateStaticParams, renders the client component
import PartOverviewPage from './PartOverviewPage'

export function generateStaticParams() {
  return [
    { moduleId: 'module-1', partId: '1' },
    { moduleId: 'module-1', partId: '2' },
    { moduleId: 'module-1', partId: '3' },
  ]
}

export default function Page() {
  return <PartOverviewPage />
}
