import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase browser client for client components.
 * Use this in client-side components to interact with Supabase.
 */
export function createBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}

// Export singleton instance for convenience
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient()
  }
  return browserClient
}
