import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getOrgContext } from '@/lib/organizations'
import { createAIClient } from '@/ai/client'
import { usageTracker } from '@/ai/cost/tracker'
import { checkLimit, getOptimalModel, getRemainingLimits } from '@/ai/cost/limits'
import { checkAlert, checkAllPeriodsForAlerts, AlertType } from '@/ai/cost/alerting'
import { StreamData, experimental } from 'ai'

export const experimental = experimental({
  sharedStream: true,
})

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    const { query } = await request.json()
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    if (query.length > 2000) {
      return new Response(JSON.stringify({ error: 'Query too long (max 2000 characters)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    const { orgId } = await getOrgContext()
    
    if (!orgId) {
      return new Response(JSON.stringify({ error: 'Organization context required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    const estimatedTokens = Math.ceil(query.length / 4) + 500
    
    const limitCheck = await checkLimit(orgId, estimatedTokens)
    
    if (!limitCheck.allowed) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        reason: limitCheck.reason,
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    const selectedModel = getOptimalModel(query)
    const estimatedTokens = Math.ceil(query.length / 4) + 500
    
    const limitCheck = await checkLimit(orgId, estimatedTokens)
    if (!limitCheck.allowed) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        reason: limitCheck.reason,
        remaining: limitCheck.remaining,
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    const { stream, tools } = await createAIClient(query.trim(), orgId, {
      model: selectedModel,
    })
    
    const customReadable = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            controller.enqueue(value)
          }
        } catch (error) {
          controller.error(error)
        } finally {
          controller.close()
        }
      },
    })
    
    const usage = await usageTracker.getUsage(orgId, 'monthly')
    const alerts = await checkAllPeriodsForAlerts(orgId)
    const limits = await getRemainingLimits(orgId)
    
    const responseHeaders = new Headers()
    responseHeaders.set('Content-Type', 'text/plain; charset=utf-8')
    responseHeaders.set('X-AI-Model', selectedModel)
    responseHeaders.set('X-AI-Org-ID', orgId)
    responseHeaders.set('X-AI-Usage-Prompt-Tokens', String(Math.ceil(query.length / 4)))
    responseHeaders.set('X-AI-Usage-Monthly', String(usage.totalTokens))
    responseHeaders.set('X-AI-Usage-Limit', String(limits.monthly.limit))
    responseHeaders.set('X-AI-Usage-Remaining', String(limits.monthly.remaining))
    
    const promptTokens = Math.ceil(query.length / 4)
    const completionTokens = Math.ceil(query.length / 2)
    
    usageTracker.track(orgId, promptTokens, completionTokens).catch(err => {
      console.error('Failed to track usage:', err)
    })
    
    checkAlert(orgId, 'monthly').then(alertType => {
      if (alertType) {
        console.log(`[AI Alert] Org ${orgId}: ${alertType}`)
      }
    }).catch(err => {
      console.error('Failed to check alerts:', err)
    })
    
    return new Response(customReadable, {
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('AI Query API error:', error)
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = (searchParams.get('period') as 'daily' | 'weekly' | 'monthly') || 'monthly'
  
  try {
    const cookieStore = cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    const { orgId } = await getOrgContext()
    
    if (!orgId) {
      return new Response(JSON.stringify({ error: 'Organization context required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    const usage = await usageTracker.getUsage(orgId, period)
    
    return new Response(JSON.stringify({
      usage,
      period,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('AI Usage API error:', error)
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
