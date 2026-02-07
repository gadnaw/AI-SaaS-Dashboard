"use client"

import * as React from "react"
import { createContext, useContext, useCallback, useState, type ReactNode } from "react"
import { supabase } from "./hooks"
import { ConnectionIndicator } from "@/components/realtime/connection-indicator"

interface RealtimeContextType {
  isConnected: boolean
  connectionState: "connected" | "reconnecting" | "disconnected"
  ConnectionIndicator: React.ComponentType<{ showLabel?: boolean; className?: string }>
}

const RealtimeContext = createContext<RealtimeContextType | null>(null)

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error("useRealtime must be used within a RealtimeProvider")
  }
  return context
}

interface RealtimeProviderProps {
  children: ReactNode
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const [connectionState, setConnectionState] = useState<"connected" | "reconnecting" | "disconnected">("disconnected")

  // Initialize connection on mount
  React.useEffect(() => {
    const channel = supabase.channel("global", {
      config: {
        presence: {
          key: "global",
        },
      },
    })

    channel
      .on("presence", { event: "sync" }, () => {
        setConnectionState("connected")
      })
      .on("realtime_event", (payload) => {
        if (payload.status === "SUBSCRIBED") {
          setConnectionState("connected")
        } else if (payload.status === "CHANNEL_ERROR") {
          setConnectionState("disconnected")
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionState("connected")
        } else if (status === "CLOSED") {
          setConnectionState("disconnected")
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const value: RealtimeContextType = {
    isConnected: connectionState === "connected",
    connectionState,
    ConnectionIndicator: (props) => (
      <ConnectionIndicator state={connectionState} {...props} />
    ),
  }

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  )
}
