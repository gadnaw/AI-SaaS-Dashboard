import { requireAdminMFA } from '@/lib/auth/admin-middleware'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // This will redirect admins without MFA to enrollment
  await requireAdminMFA()

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="pl-64 transition-all duration-300">
        <main className="min-h-screen bg-background">{children}</main>
      </div>
    </div>
  )
}
