"use client"

import { Bell, Search, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRealtime } from "@/lib/realtime/provider"
import { ConnectionIndicator } from "@/components/realtime/connection-indicator"
import { ThemeToggle } from "@/components/theme-toggle"

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const { ConnectionIndicator: RealtimeIndicator, connectionState } = useRealtime()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Connection status indicator */}
        <div className="hidden md:flex items-center gap-2">
          <RealtimeIndicator showLabel />
        </div>

        {/* Search placeholder */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search..."
            className={cn(
              "h-9 w-64 rounded-lg border bg-background pl-9 pr-4 text-sm",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary"
            )}
          />
        </div>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <button
          className="relative rounded-lg p-2 hover:bg-accent"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* User menu */}
        <button
          className="flex items-center gap-2 rounded-lg p-1 hover:bg-across"
          aria-label="User menu"
        >
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
        </button>
      </div>
    </header>
  )
}
