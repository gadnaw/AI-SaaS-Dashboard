"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { RealtimeChannel } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

export type ConnectionState = "connected" | "reconnecting" | "disconnected"

interface UseRealtimeSubscriptionOptions {
  channel: string
  events?: string[]
  onData?: (payload: any) => void
  onConnectionChange?: (state: ConnectionState) => void
  onError?: (error: any) => void
}

export function useRealtimeSubscription({
  channel: channelName,
  events = ["*"],
  onData,
  onConnectionChange,
  onError,
}: UseRealtimeSubscriptionOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected")
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const retryCount = useRef(0)
  const maxRetries = 3
  const retryDelays = [1000, 2000, 4000] // 1s, 2s, 4s

  const connect = useCallback(() => {
    if (channel) {
      supabase.removeChannel(channel)
    }

    const newChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: "dashboard",
        },
      },
    })

    newChannel
      .on("realtime", { event: "*" }, (payload) => {
        if (onData) {
          onData(payload)
        }
      })
      .on("realtime_event", (payload) => {
        // Handle connection state changes
        if (payload.status === "SUBSCRIBED") {
          setConnectionState("connected")
          retryCount.current = 0
          if (onConnectionChange) {
            onConnectionChange("connected")
          }
        } else if (payload.status === "CHANNEL_ERROR") {
          setConnectionState("reconnecting")
          if (onConnectionChange) {
            onConnectionChange("reconnecting")
          }

          // Exponential backoff reconnection
          if (retryCount.current < maxRetries) {
            const delay = retryDelays[retryCount.current]
            retryCount.current++

            setTimeout(() => {
              connect()
            }, delay)
          } else {
            setConnectionState("disconnected")
            if (onConnectionChange) {
              onConnectionChange("disconnected")
            }
            if (onError) {
              onError(new Error("Max reconnection attempts reached"))
            }
          }
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionState("connected")
          if (onConnectionChange) {
            onConnectionChange("connected")
          }
        } else if (status === "CLOSED") {
          setConnectionState("disconnected")
          if (onConnectionChange) {
            onConnectionChange("disconnected")
          }
        }
      })

    setChannel(newChannel)

    return () => {
      supabase.removeChannel(newChannel)
    }
  }, [channelName, events, onData, onConnectionChange, onError])

  useEffect(() => {
    const cleanup = connect()
    return () => {
      cleanup()
    }
  }, [connect])

  return {
    connectionState,
    subscribe: connect,
    unsubscribe: () => {
      if (channel) {
        supabase.removeChannel(channel)
        setChannel(null)
        setConnectionState("disconnected")
      }
    },
  }
}
