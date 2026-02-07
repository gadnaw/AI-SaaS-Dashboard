import { Suspense } from 'react'
import { DashboardSkeleton } from '@/components/loading/skeleton'

// Route segment configuration for ISR (Incremental Static Regeneration)
export const revalidate = 60 // Revalidate every 60 seconds
export const dynamicParams = true // Allow dynamic segments not in generateStaticParams

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <a href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="text-lg">AI Dashboard</span>
          </a>
        </div>
        <nav className="flex-1 overflow-auto py-4">
          <Suspense fallback={<NavSkeleton />}>
            <DashboardNav />
          </Suspense>
        </nav>
        <div className="border-t p-4">
          {/* Connection indicator and user info */}
          <Suspense fallback={<div className="h-10 w-full animate-pulse bg-muted rounded" />}>
            <ConnectionStatus />
          </Suspense>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        <div className="flex-1 space-y-6 p-4 lg:p-8">
          <Suspense fallback={<DashboardSkeleton />}>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  )
}

// Dashboard Navigation Component
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, Search, Settings, Bell } from 'lucide-react'

function DashboardNav() {
  const pathname = usePathname()

  const navItems = [
    {
      title: 'Overview',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Customers',
      href: '/dashboard/customers',
      icon: Users,
    },
    {
      title: 'AI Queries',
      href: '/dashboard/queries',
      icon: Search,
    },
    {
      title: 'Alerts',
      href: '/dashboard/alerts',
      icon: Bell,
    },
    {
      title: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
    },
  ]

  return (
    <nav className="grid items-start px-4 text-sm font-medium">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary',
              isActive 
                ? 'bg-primary/10 text-primary' 
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.title}
          </Link>
        )
      })}
    </nav>
  )
}

// Connection Status Component
import { useConnectionIndicator } from '@/lib/realtime/hooks'

function ConnectionStatus() {
  const { isConnected, status } = useConnectionIndicator()

  return (
    <div className="flex items-center gap-2 text-sm">
      <div 
        className={`h-2 w-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      <span className="text-muted-foreground">
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  )
}

// Navigation Skeleton
function NavSkeleton() {
  return (
    <div className="grid gap-2 px-4">
      {[...Array(5)].map((_, i) => (
        <div 
          key={i} 
          className="h-10 w-full animate-pulse rounded-lg bg-muted"
        />
      ))}
    </div>
  )
}
