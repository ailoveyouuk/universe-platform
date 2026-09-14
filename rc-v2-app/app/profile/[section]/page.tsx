// Server component — exports generateStaticParams, renders the client component
import ProfileSectionPage from './ProfileSectionPage'

export function generateStaticParams() {
  return [
    { section: '1' },
    { section: '2' },
    { section: '3' },
    { section: '4' },
    { section: '5' },
    { section: '6' },
    { section: '7' },
    { section: '8' },
    { section: '9' },
  ]
}

export default function Page() {
  return <ProfileSectionPage />
}
