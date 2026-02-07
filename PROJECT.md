# AI-Powered SaaS Dashboard

## Overview

Multi-tenant SaaS dashboard with AI-powered data features. Users ask questions about their business data in natural language ("Show me revenue by region last quarter"), and the dashboard generates charts, summaries, and intelligent alerts. Combines traditional SaaS patterns (multi-tenant auth, role-based access, data tables) with AI capabilities (function calling, anomaly detection, natural language queries). Demonstrates a different AI pattern from RAG -- this uses OpenAI function calling to translate natural language into database actions.

## Goals

- Demonstrate OpenAI function calling (different from RAG -- shows AI breadth)
- Show multi-tenant SaaS architecture with Supabase RLS
- Prove ability to build production-grade dashboards with data visualization
- Demonstrate AI-generated summaries and anomaly detection
- Target Upwork job categories: SaaS Development, Dashboard/Analytics, AI/ML Development, Full-Stack Development

## Tech Stack

- **Framework:** Next.js 14+ App Router, TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **AI SDK:** Vercel AI SDK (`useChat` for chat-with-data, `streamText` for summaries)
- **LLM:** OpenAI GPT-4o (function calling requires stronger reasoning than mini)
- **Database:** Supabase PostgreSQL with Row-Level Security
- **Auth:** Supabase Auth (email + OAuth) with MFA for admin role
- **Real-time:** Supabase Realtime (live dashboard updates when data changes)
- **Charts:** Recharts (React charting library)
- **Data Tables:** TanStack Table (filterable, sortable, paginated)
- **Deployment:** Vercel

## Pages / Screens

### Login Page (`/login`)
- Supabase Auth: email/password + OAuth (Google)
- Redirect to dashboard on successful auth
- MFA challenge for admin accounts

### Dashboard Page (`/`)
- **Route:** `/`
- **Role:** All authenticated users
- **What user sees:** KPI cards (revenue, users, orders, growth %), main chart area, recent activity feed
- **Key interactions:**
  - Natural language query bar: "Show me revenue by region last quarter" -> generates chart + AI summary
  - One-click AI summary of any data view ("Summarize this dashboard")
  - Real-time KPI updates via Supabase Realtime subscriptions
- **Data displayed:** Organization-scoped metrics (RLS ensures org isolation)

### Users Page (`/users`)
- **Route:** `/users`
- **Role:** Admin only
- **What user sees:** User management table with role assignment
- **Key interactions:** Invite new user (email), assign role (admin/member), deactivate account
- **Data displayed:** All users in the organization with roles, last active date, status

### Data Table Page (`/data`)
- **Route:** `/data`
- **Role:** All authenticated users
- **What user sees:** Filterable, sortable data table with all business records
- **Key interactions:** Column filtering, sorting, pagination, CSV export, search
- **Data displayed:** Organization's business data (orders, transactions, etc.)

### Settings Page (`/settings`)
- **Route:** `/settings`
- **Role:** Admin only
- **What user sees:** Organization settings, billing (Stripe mock), team management
- **Key interactions:** Update org name, manage billing plan, configure alert thresholds
- **Data displayed:** Current plan, usage statistics, team member count

### Profile Page (`/profile`)
- **Route:** `/profile`
- **Role:** All authenticated users
- **What user sees:** Personal profile, password change, MFA setup
- **Key interactions:** Edit display name, change password, enroll/unenroll MFA

## Features

### Must-Have
- **Natural language data queries:** User types question -> AI function calling generates parameterized query -> chart + streaming summary
- **AI-generated summaries:** One-click summary of any data view
- **Multi-tenant RLS:** Org-level data isolation via Supabase RLS policies
- **Role-based access:** Admin sees all org features, member sees dashboard + data
- **KPI dashboard:** Cards with key metrics, main chart, activity feed
- **Data table:** TanStack Table with filtering, sorting, pagination, CSV export
- **Supabase Auth:** Email/password + OAuth with MFA for admins
- **Real-time updates:** Dashboard KPIs update live when new data arrives

### Nice-to-Have
- **Smart alerts:** AI detects anomalies in data (revenue drop, unusual patterns) and sends notifications
- **Scheduled AI reports:** Daily/weekly AI-generated summary email
- **Dashboard customization:** Drag-and-drop widget layout
- **Stripe integration:** Mock billing page with subscription management
- **Dark mode**

## Data Model

### organizations
- `id` (uuid, PK)
- `name` (text)
- `plan` (text) -- 'free' | 'pro' | 'enterprise'
- `settings` (jsonb)
- `created_at` (timestamptz)

### users
- `id` (uuid, PK) -- from Supabase Auth
- `org_id` (uuid, FK -> organizations.id)
- `email` (text)
- `display_name` (text)
- `role` (text) -- 'admin' | 'member'
- `last_active_at` (timestamptz)
- `created_at` (timestamptz)

### revenue_data (sample business data)
- `id` (uuid, PK)
- `org_id` (uuid, FK -> organizations.id)
- `region` (text) -- 'East' | 'West' | 'North' | 'South'
- `amount` (numeric)
- `category` (text)
- `date` (date)
- `created_at` (timestamptz)

### orders (sample business data)
- `id` (uuid, PK)
- `org_id` (uuid, FK -> organizations.id)
- `customer_name` (text)
- `amount` (numeric)
- `status` (text) -- 'pending' | 'completed' | 'cancelled'
- `created_at` (timestamptz)

### audit_log
- `id` (uuid, PK)
- `org_id` (uuid, FK -> organizations.id)
- `user_id` (uuid, FK -> users.id)
- `action` (text)
- `details` (jsonb)
- `created_at` (timestamptz)

### RLS Policies
- **Org-level isolation:** All data tables use `WHERE org_id = (SELECT org_id FROM users WHERE id = auth.uid())`
- **Role-based:** Admin-only pages check `role = 'admin'` in middleware (not RLS -- page-level access)
- **Audit log:** Append-only (INSERT only via RLS)

## AI Architecture

### Function Calling Pipeline (NOT RAG)
This demo uses a fundamentally different AI pattern from A1/A2. Instead of retrieving documents, the AI decides what database actions to take.

1. **User Input:** "Show me revenue by region last quarter"
2. **Function Schema:** AI receives available functions with parameter definitions:
   - `queryDatabase({ table, columns, groupBy, dateRange, aggregation, filters })`
   - `generateChart({ type, data, title, xAxis, yAxis })`
   - `summarizeData({ data, question })`
3. **AI Decision:** GPT-4o analyzes the question and returns a structured function call:
   ```json
   { "name": "queryDatabase", "args": { "table": "revenue_data", "groupBy": "region", "dateRange": "last_quarter", "aggregation": "sum", "columns": ["region", "amount"] } }
   ```
4. **Parameterized Execution:** Your code validates args against actual schema, builds a safe parameterized query (NEVER raw SQL from AI), executes via Supabase, returns results
5. **Chart Generation:** AI may call `generateChart` with the data to determine chart type
6. **AI Summary:** Results sent back to AI for a streaming natural language summary

### Schema Grounding
- Pass the actual database schema (table names, column names, types) in the function definition
- AI can only reference columns that exist -- hallucinated column names fail validation before reaching the database
- Validation layer between AI output and database: check table name is allowed, column names exist, aggregation type is valid

### Anomaly Detection (Nice-to-Have)
- Scheduled job (Supabase Edge Function, runs hourly)
- Calculate per-org baselines: daily average, standard deviation, weekly patterns (90-day window)
- Compare current period against baseline
- If deviation > 3x standard deviation: flag as anomaly
- AI enrichment: send deviation data to GPT-4o-mini for natural language explanation
- Alert delivery: in-dashboard notification + optional email/Slack

### Cost Estimation
- Function calling: GPT-4o ~$0.0025 per query (requires reasoning for SQL generation)
- Summary generation: GPT-4o-mini ~$0.0003 per summary
- Anomaly analysis: GPT-4o-mini ~$0.0003 per org per hour
- At 500 AI queries/day: ~$1.25/day = ~$38/month

## Security Requirements

- **Auth:** Supabase Auth with email + OAuth, MFA for admin accounts
- **RLS:** Org-level isolation on all data tables -- admins see all org rows, members see all org rows
- **Role-based access:** Admin-only pages protected by middleware role check
- **Audit log:** Append-only, records all data access and AI queries
- **Session management:** Token expiry via Supabase auth, admin sessions shorter
- **AI safety:** Never pass AI-generated SQL directly to database. Always parameterize. Validate column names against schema before query execution.
- **Token storage:** httpOnly cookies, Secure flag, SameSite=Strict

## Key Technical Decisions

- **Function calling over RAG:** This dashboard queries structured data, not documents. Function calling is the correct pattern -- AI decides what query to run, not what text to retrieve.
- **GPT-4o over GPT-4o-mini for queries:** SQL generation requires stronger reasoning. Mini hallucinates column names more frequently. GPT-4o for the query step, mini for summaries.
- **Recharts over D3/Chart.js:** Recharts is React-native (composable components), integrates naturally with Next.js, and has good TypeScript support. D3 is more powerful but harder to integrate with React.
- **TanStack Table over AG Grid:** TanStack is headless (full UI control with Tailwind), free, and lighter. AG Grid is overkill for a demo and has licensing costs.
- **Supabase Realtime for live updates:** Zero additional cost, already using Supabase, subscribe to table changes for live KPI updates.
- **Org-level RLS (not user-level):** SaaS teams need shared visibility into org data. Individual users shouldn't be siloed from their team's metrics.

## Upwork Positioning

- **Project Catalog listings supported:** "AI SaaS Dashboard", "Business Analytics Platform", "Multi-Tenant SaaS Application"
- **Price tiers enabled:** $5,000-15,000 (SaaS dashboard), $15,000-30,000 (AI-powered analytics platform)
- **Key selling points for proposals:**
  - "Natural language data queries -- your team asks questions in plain English, gets charts and summaries instantly"
  - "Multi-tenant architecture with row-level security -- your customers' data is isolated at the database level"
  - "AI uses function calling, not just chat -- it actually queries your database and generates visualizations"
  - Demonstrates both SaaS fundamentals AND AI integration

## Build Estimate

- **Estimated effort:** 1-2 days with Claude Code
- **Priority:** #4 -- builds on patterns from A1/A2 but shows a different AI capability (function calling vs RAG)
- **Build order rationale:** After A1/A2 (RAG) and A4 (chatbot), this demo proves breadth by showcasing function calling -- a completely different AI pattern. Clients see you can do more than just chatbots.
