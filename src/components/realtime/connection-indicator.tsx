"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { ConnectionState } from "./hooks"

const connectionIndicatorVariants = cva(
  "inline-flex items-center justify-center rounded-full transition-colors duration-200",
  {
    variants: {
      variant: {
        connected: "bg-green-500/20 text-green-600",
        reconnecting: "bg-yellow-500/20 text-yellow-600 animate-pulse",
        disconnected: "bg-red-500/20 text-red-600",
      },
      size: {
        sm: "h-2 w-2",
        md: "h-3 w-3",
        lg: "h-4 w-4",
      },
    },
    defaultVariants: {
      variant: "connected",
      size: "sm",
    },
  }
)

interface ConnectionIndicatorProps
  extends VariantProps<typeof connectionIndicatorVariants> {
  state: ConnectionState
  showLabel?: boolean
  className?: string
}

export function ConnectionIndicator({
  state,
  showLabel = false,
  className,
}: ConnectionIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={connectionIndicatorVariants({ variant: state, size: "md" })}>
        <span className="h-2 w-2 rounded-full bg-current" />
      </div>
      {showLabel && (
        <span className="text-xs font-medium capitalize text-muted-foreground">
          {state}
        </span>
      )}
    </div>
  )
}

export function useConnectionIndicator() {
  const [state, setState] = React.useState<ConnectionState>("disconnected")

  const updateState = React.useCallback((newState: ConnectionState) => {
    setState(newState)
  }, [])

  return {
    state,
    setState: updateState,
  }
}
