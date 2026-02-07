# Phase 2: AI Query Engine - Architectural Decisions

## Overview

This document outlines key architectural and implementation decisions for implementing OpenAI function calling pipeline in Phase 2. The goal is to enable natural language to database queries while maintaining security, performance, and cost efficiency.

---

## 1. Function Schema Design

### Decision: JSON Schema with Strict Type Definitions

**Recommended Approach:**

```typescript
const queryDatabaseSchema = {
  type: "function",
  function: {
    name: "queryDatabase",
    description: "Execute a read-only database query on the tenant's data",
    parameters: {
      type: "object",
      properties: {
        table: {
          type: "string",
          enum: ["users", "products", "orders", "analytics_events"],
          description: "Target table name"
        },
        filters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              column: { type: "string" },
              operator: { 
                type: "string",
                enum: ["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains"]
              },
              value: { type: "string" }
            },
            required: ["column", "operator", "value"]
          }
        },
        aggregations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              column: { type: "string" },
              function: {
                type: "string",
                enum: ["count", "sum", "avg", "min", "max"]
              },
              alias: { type: "string" }
            }
          }
        },
        limit: { type: "integer", minimum: 1, maximum: 1000 },
        orderBy: {
          type: "object",
          properties: {
            column: { type: "string" },
            direction: { type: "string", enum: ["asc", "desc"] }
          }
        }
      },
      required: ["table"]
    }
  }
}
```

**Decisions Made:**
- Use enum constraints for tables and operators to prevent hallucination
- Required `table` parameter with strict type validation
- Aggregations and filters as arrays to support complex queries
- Limit parameter with hard upper bound (1000 rows) for safety

**Open Questions:**
- Should we allow JOIN operations? (Increases complexity, potential for errors)
- How to handle dynamic table names from user input?

**Trade-offs:**
- Strict schemas reduce flexibility but prevent SQL injection and hallucination
- Predefined tables mean schema changes require code deployment
- Consider phased rollout: start with single table, expand as confidence grows

---

## 2. AI Query Pipeline

### Decision: Vercel AI SDK with Streaming Responses

**Recommended Stack:**
```typescript
import { streamText, createDataStreamResponse } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(request: Request) {
  const { messages, tenantId, userId } = await request.json();
  
  const result = await streamText({
    model: openai('gpt-4o'),
    messages,
    tools: {
      queryDatabase,
      generateChart,
      summarizeData
    },
    maxSteps: 5,
    onStepFinish: (step) => {
      // Log token usage, step details
    }
  });
  
  return result.toDataStreamResponse();
}
```

**Decisions Made:**
- Use `streamText` for real-time feedback during multi-step queries
- GPT-4o for complex queries, GPT-4o-mini for simple summarization
- Max 5 steps to prevent infinite loops

**Streaming vs Non-Streaming Trade-offs:**

| Aspect | Streaming | Non-Streaming |
|--------|-----------|---------------|
| User Experience | Immediate feedback, perceived speed | Complete response, easier validation |
| Implementation | Complex state management | Simpler, all-or-nothing |
| Cost | Same (token-based) | Same |
| Error Handling | Partial results possible | Full result or failure |
| Recommendation | ✅ Use for UX | Consider for admin queries |

**Error Handling Strategy:**
1. **Retry Logic:** Exponential backoff for rate limits (3 retries max)
2. **Fallback Model:** GPT-4o-mini if GPT-4o unavailable
3. **Graceful Degradation:** Return partial results with error message
4. **User Notifications:** Stream errors to user in real-time

**Cost Tracking:**
```typescript
interface CostMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  model: string;
  timestamp: Date;
}

// Log to Supabase for per-org/user tracking
await supabase.from('ai_usage_logs').insert({
  org_id: tenantId,
  user_id: userId,
  ...costMetrics
});
```

**Rate Limiting:**
- Per user: 100 queries/hour
- Per organization: 1000 queries/hour
- Burst limit: 10 concurrent requests per user

---

## 3. Function Definitions

### 3.1 queryDatabase Function

**Implementation:**
```typescript
const queryDatabase = tool({
  description: 'Execute a read-only database query with filtering and aggregation',
  parameters: z.object({
    table: z.enum(['users', 'products', 'orders', 'analytics_events']),
    filters: z.array(z.object({
      column: z.string(),
      operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains']),
      value: z.string()
    })).optional(),
    aggregations: z.array(z.object({
      column: z.string(),
      function: z.enum(['count', 'sum', 'avg', 'min', 'max']),
      alias: z.string()
    })).optional(),
    limit: z.number().min(1).max(1000).default(100),
    orderBy: z.object({
      column: z.string(),
      direction: z.enum(['asc', 'desc'])
    }).optional()
  }),
  
  execute: async ({ table, filters, aggregations, limit, orderBy }) => {
    // Build Supabase query with RLS
    let query = supabase.from(table).select('*');
    
    // Apply filters
    filters?.forEach(filter => {
      query = query.filter(filter.column, filter.operator, filter.value);
    });
    
    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.direction === 'asc' });
    }
    
    // Apply limit
    query = query.limit(limit);
    
    return query;
  }
});
```

**Security:**
- RLS enforced at database level
- Additional validation layer for column existence
- No raw SQL execution - built query builder only

### 3.2 generateChart Function

**Implementation:**
```typescript
const generateChart = tool({
  description: 'Generate a chart configuration from query results',
  parameters: z.object({
    chartType: z.enum(['line', 'bar', 'pie', 'area', 'scatter']),
    data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
    xAxis: z.string(),
    yAxis: z.string(),
    title: z.string().optional(),
    colors: z.array(z.string()).optional()
  }),
  
  execute: async ({ chartType, data, xAxis, yAxis, title, colors }) => {
    // Return chart configuration for frontend
    return {
      type: chartType,
      data: {
        labels: data.map(d => d[xAxis]),
        datasets: [{
          label: yAxis,
          data: data.map(d => d[yAxis])
        }]
      },
      options: { responsive: true, plugins: { title } }
    };
  }
});
```

### 3.3 summarizeData Function

**Implementation:**
```typescript
const summarizeData = tool({
  description: 'Generate a natural language summary of query results',
  parameters: z.object({
    data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
    question: z.string(),
    context: z.string().optional()
  }),
  
  execute: async ({ data, question, context }) => {
    // Use separate lightweight model for summarization
    const summary = await generateSummary(data, question, context);
    return summary;
  }
});
```

### 3.4 Custom Functions (Future Extension)

**Considerations for Custom Functions:**
- Allow org-level function registration
- Validate custom function code before deployment
- Sandbox execution environment
- Rate limiting per function

---

## 4. Validation Layer

### Decision: Multi-Layer Validation Pipeline

**Validation Flow:**

```
User Query → AI Parsing → Schema Validation → Column Check → Query Execution → Result Validation
     ↓              ↓              ↓              ↓              ↓               ↓
  Intent      Type Check     Whitelist     Existence     RLS Check     Output Schema
  Detection   Structure     Enforcement   Verification  Supabase      Compliance
```

### 4.1 Schema Validation

```typescript
const validateSchema = (params: QueryParams): ValidationResult => {
  // 1. Type validation
  const typeResult = typeValidator.validate(params);
  if (!typeResult.valid) {
    return { valid: false, error: `Type error: ${typeResult.errors}` };
  }
  
  // 2. Whitelist validation
  const allowedTables = ['users', 'products', 'orders', 'analytics_events'];
  if (!allowedTables.includes(params.table)) {
    return { valid: false, error: 'Table not accessible' };
  }
  
  // 3. Operator validation
  const allowedOperators = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains'];
  const invalidOperators = params.filters
    ?.map(f => f.operator)
    .filter(op => !allowedOperators.includes(op));
  
  if (invalidOperators?.length) {
    return { valid: false, error: `Invalid operators: ${invalidOperators.join(', ')}` };
  }
  
  return { valid: true };
};
```

### 4.2 Column Existence Checking

```typescript
const validateColumns = async (table: string, columns: string[]): Promise<boolean> => {
  const { data: schema } = await supabase
    .from('table_schemas')
    .select('columns')
    .eq('table_name', table)
    .single();
  
  const validColumns = schema?.columns || [];
  const invalidColumns = columns.filter(col => !validColumns.includes(col));
  
  if (invalidColumns.length > 0) {
    throw new Error(`Invalid columns: ${invalidColumns.join(', ')}`);
  }
  
  return true;
};
```

### 4.3 SQL Injection Prevention

**Measures:**
- Parameterized queries via Supabase client
- No raw SQL execution
- Column/table whitelisting
- Operator whitelisting
- Limit on query complexity (nested filters max depth: 3)

### 4.4 Rate Limiting

```typescript
const rateLimiter = async (userId: string, orgId: string): Promise<void> => {
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 100;
  
  const { count } = await supabase
    .from('ai_requests')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - windowMs));
  
  if (count >= maxRequests) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  
  // Log request
  await supabase.from('ai_requests').insert({ user_id: userId, org_id: orgId });
};
```

---

## 5. Context Management

### Decision: Hybrid Context Strategy

**Context Components:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Conversation Context                      │
├─────────────────────────────────────────────────────────────┤
│ 1. Recent Messages (last 10 messages, ~4k tokens)            │
│ 2. Schema Context (table definitions, ~2k tokens)            │
│ 3. User Context (org_id, user preferences, ~500 tokens)      │
│ 4. System Prompt (rules, constraints, ~1k tokens)            │
├─────────────────────────────────────────────────────────────┤
│ Total: ~7.5k tokens per request (within GPT-4o context)      │
└─────────────────────────────────────────────────────────────┘
```

### 5.1 Schema Context

```typescript
const getSchemaContext = async (orgId: string): Promise<string> => {
  const { data: tables } = await supabase
    .from('table_schemas')
    .select('table_name, columns, description')
    .eq('org_id', orgId);
  
  return tables.map(t => 
    `Table: ${t.table_name}\n` +
    `Description: ${t.description}\n` +
    `Columns: ${t.columns.map(c => 
      `  - ${c.name}: ${c.type} (${c.nullable ? 'optional' : 'required'})`
    ).join('\n')}`
  ).join('\n\n');
};
```

### 5.2 Conversation History

**Strategy:**
- Keep last 10 messages for short-term context
- Compress older messages with summarization
- Clear history on new session or explicit reset
- Token budget enforcement per conversation

```typescript
const manageContext = async (messages: Message[]): Promise<Message[]> => {
  const maxTokens = 8000;
  let currentTokens = 0;
  const recentMessages: Message[] = [];
  
  // Process messages from most recent to oldest
  for (const msg of messages.reverse()) {
    const msgTokens = estimateTokens(msg.content);
    if (currentTokens + msgTokens > maxTokens) break;
    
    recentMessages.unshift(msg);
    currentTokens += msgTokens;
  }
  
  return recentMessages;
};
```

### 5.3 Multi-Turn Query Refinement

**Pattern:**
```
User: "Show me sales for Q4"
AI: [Queries data] → "Q4 sales were $150,000"
User: "Break it down by region"
AI: [Refines query with region filter] → [Returns regional breakdown]
User: "Which region performed best?"
AI: [Analyzes previous results] → "Region X performed best with $50,000"
```

**Implementation:**
- Maintain query state between turns
- Reference previous results via tool context
- Allow explicit clarification questions

---

## 6. Cost Optimization

### Decision: Tiered Model Strategy with Caching

**Model Selection:**

| Query Type | Model | Reasoning |
|------------|-------|-----------|
| Simple queries (< 20 tokens) | GPT-4o-mini | Fast, cheap, sufficient |
| Complex queries (> 50 tokens) | GPT-4o | Better reasoning, accuracy |
| Summarization | GPT-4o-mini | Pattern recognition, low compute |
| Chart generation | GPT-4o | Precise configuration needed |

### 6.1 Prompt Caching

```typescript
// Cache schema context (most expensive, least volatile)
const schemaCache = await caches.open('schema-context');
const cachedSchema = await schemaCache.match(orgId);
if (cachedSchema) {
  messages.unshift({ role: 'system', content: cachedSchema });
}

// Cache system prompt (same for all users)
const systemPrompt = await getSystemPrompt();
messages.unshift({ role: 'system', content: systemPrompt });
```

### 6.2 Token Budgeting

```typescript
const budgetPerQuery = {
  maxInputTokens: 8000,
  maxOutputTokens: 2000,
  maxTotalTokens: 10000,
  maxCostPerQuery: 0.05 // $0.05 max per query
};

const estimateCost = (tokens: number, model: string): number => {
  const rates = {
    'gpt-4o': { input: 2.5, output: 10 }, // per 1M tokens
    'gpt-4o-mini': { input: 0.15, output: 0.6 }
  };
  // Calculate cost
};
```

### 6.3 Usage Monitoring Dashboard

```typescript
// Track in Supabase
await supabase.from('ai_usage_metrics').insert({
  org_id: orgId,
  user_id: userId,
  query_type,
  tokens_used,
  cost,
  model,
  timestamp: new Date()
});

// Dashboard queries
const getOrgUsage = async (orgId: string, period: 'day' | 'week' | 'month') => {
  return supabase
    .from('ai_usage_metrics')
    .select('cost, tokens_used, user_id, created_at')
    .eq('org_id', orgId)
    .gte('created_at', startOfPeriod(period))
    .order('created_at', { ascending: false });
};
```

---

## Summary of Decisions

### ✅ Confirmed Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Schema Format | JSON Schema with enums | Prevents hallucination, enables validation |
| SDK | Vercel AI SDK streamText | Best DX, streaming support, function calling |
| Response Mode | Streaming | Better UX for long-running queries |
| Model Strategy | GPT-4o + GPT-4o-mini tiered | Balances capability and cost |
| Validation | Multi-layer (type, schema, column, RLS) | Defense in depth |
| Context | Hybrid (recent + schema + user) | Balances relevance and token cost |
| Rate Limits | Per user + per org | Fair usage, prevents abuse |

### ❓ Open Questions

1. **Dynamic Tables:** Should we support user-defined tables or keep hardcoded?
2. **Custom Functions:** When to allow org-level custom function registration?
3. **Offline Mode:** Fallback to cached results if AI service unavailable?
4. **A/B Testing:** Should we test different system prompts or models?

### 🔄 Trade-offs Considered

| Trade-off | Chosen Path | Reason |
|-----------|-------------|--------|
| Flexibility vs Safety | Safety first | Multi-tenant requires strict controls |
| Speed vs Accuracy | Accuracy prioritized | Enterprise data requires correctness |
| Cost vs Capability | Tiered approach | Optimize for common cases |
| Context vs Performance | Compressed context | Token limits require optimization |

### 📋 Recommended Implementation Order

1. **Week 1:** Core infrastructure (validation, rate limiting, basic query function)
2. **Week 2:** Function definitions (generateChart, summarizeData)
3. **Week 3:** Context management and conversation handling
4. **Week 4:** Cost optimization and monitoring dashboard
5. **Ongoing:** Performance tuning and feature expansion

### 🎯 Success Metrics for Phase 2

- **Accuracy:** >95% query success rate (no schema errors)
- **Latency:** <3s for simple queries, <10s for complex queries
- **Cost:** <$0.02 average per query
- **User Satisfaction:** >4.5/5 rating on query helpfulness
