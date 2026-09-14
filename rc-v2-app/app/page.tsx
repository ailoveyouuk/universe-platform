import { redirect } from 'next/navigation'

// Root route — redirect to dashboard
export default function RootPage() {
  redirect('/dashboard')
}
