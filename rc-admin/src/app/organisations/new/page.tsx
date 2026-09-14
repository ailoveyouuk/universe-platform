import { AdminLayout } from '@/components/layout/AdminLayout'
import { OrgForm }     from '@/components/organisations/OrgForm'

export default function NewOrganisationPage() {
  return (
    <AdminLayout title="New organisation" subtitle="Create a new employer or institution partner profile">
      <OrgForm mode="create" />
    </AdminLayout>
  )
}
