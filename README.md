# AI-Powered SaaS Dashboard

A production-ready, multi-tenant SaaS dashboard demonstrating advanced AI integration through OpenAI function calling. Built as a portfolio centerpiece showcasing modern full-stack architecture with Next.js 14+, Vercel AI SDK, Supabase with Row Level Security, and Kysely for type-safe database interactions.

![Dashboard Preview](./docs/preview.png)

## Features

### Core Capabilities

- **Natural Language Queries**: Ask questions about your business data in plain English and receive AI-generated charts, summaries, and tabular results
- **Smart Alerts**: Automated anomaly detection with statistical analysis (z-score, exponential smoothing) and AI-enriched recommendations
- **Real-Time Updates**: Live dashboard refresh via Supabase Realtime subscriptions
- **Multi-Tenant Architecture**: Complete isolation with Row Level Security (RLS) policies
- **Role-Based Access**: Admin and member roles with granular permissions

### UI/UX

- **Dark Mode**: Full theme support with smooth transitions and FOUC prevention
- **Customizable Dashboard**: Drag-and-drop widget reordering with persistence
- **Responsive Design**: Desktop and mobile-optimized layouts
- **Smooth Animations**: Framer Motion powered transitions throughout
- **Performance Optimized**: Core Web Vitals in green (LCP < 2.5s, CLS < 0.1, INP < 200ms)

### Technical Excellence

- **Type Safety**: Full TypeScript with Kysely type inference
- **Error Tracking**: Sentry integration with multi-level error boundaries
- **API Integration**: Vercel AI SDK with structured function calling
- **Database**: Supabase with PostgreSQL, Realtime, and Auth

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router) |
| AI Integration | Vercel AI SDK, OpenAI GPT-4o-mini |
| Database | Supabase (PostgreSQL + Realtime) |
| Type Safety | Kysely ORM with TypeScript |
| Authentication | Supabase Auth (Email + OAuth) |
| UI Components | shadcn/ui, Radix UI |
| Styling | Tailwind CSS |
| State Management | React Query (TanStack Query) |
| Drag & Drop | @dnd-kit |
| Animations | Framer Motion |
| Error Tracking | Sentry |
| Monitoring | Web Vitals |

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-saas-dashboard.git
cd ai-saas-dashboard

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

### Database Setup

1. Create a new Supabase project
2. Run migrations in `supabase/migrations/`
3. Configure RLS policies for multi-tenant isolation
4. Seed sample data for testing

```bash
# Run database migrations
npx supabase db push

# Seed sample data
npm run db:seed
```

### Development

```bash
# Start development server
npm run dev

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Build for production
npm run build
```

## Project Structure

```
ai-saas-dashboard/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Authentication routes
│   │   ├── (dashboard)/       # Dashboard routes
│   │   └── api/               # API routes
│   ├── components/
│   │   ├── ui/                # Base UI components (shadcn)
│   │   ├── dashboard/         # Dashboard-specific components
│   │   ├── alerts/            # Alert components
│   │   └── realtime/          # Realtime components
│   ├── lib/
│   │   ├── auth/              # Authentication utilities
│   │   ├── db/                # Kysely database layer
│   │   ├── alerts/            # Alert & anomaly detection
│   │   ├── realtime/          # Supabase realtime hooks
│   │   ├── analytics/         # Core Web Vitals tracking
│   │   └── theme/             # Theme provider & utilities
│   └── styles/
│       └── globals.css         # Global styles & CSS variables
├── supabase/
│   ├── migrations/            # Database migrations
│   └── seed.sql              # Sample data
├── .planning/                 # GSD planning artifacts
├── docs/                      # Documentation
└── public/                    # Static assets
```

## Architecture

### AI Query Engine

The dashboard uses OpenAI function calling to translate natural language queries into validated database operations:

```
User: "Show me revenue trends for Q4"
    ↓
AI Engine: Identifies query intent
    ↓
Function Call: { name: "generateChart", arguments: {...} }
    ↓
Zod Validation: Validates parameters
    ↓
Kysely Query: Executes type-safe SQL
    ↓
Response: Streaming chart + summary
```

### Multi-Tenant Isolation

All data access is scoped by organization through:

1. **RLS Policies**: Database-level enforcement
2. **Kysely Query Builder**: Automatic tenant_id filtering
3. **API Layer**: Request-level validation

### Realtime Updates

```
Supabase Realtime
    ↓
useRealtimeSubscription Hook
    ↓
React Query Invalidation
    ↓
UI Auto-Refresh
```

## API Reference

### Query Functions

```typescript
// Natural language query
const result = await queryAI("Show top customers by revenue");

// Results include:
// - data: Query results as typed objects
// - chart: Chart configuration for Recharts
// - summary: AI-generated text summary
// - sql: Executed SQL (for debugging)
```

### Alert System

```typescript
// Get alerts for tenant
const alerts = await getAlerts({ tenantId, status: 'active' });

// Acknowledge alert
await acknowledgeAlert(alertId);

// Check anomaly detection
const anomalies = await detectAnomalies(metrics, { window: 90 });
```

### Dashboard Widgets

```typescript
// Reorder widgets
await updateWidgetLayout(tenantId, widgets);

// Toggle visibility
await setWidgetVisibility(widgetId, visible);
```

## Deployment

### Vercel (Recommended)

1. Connect repository to Vercel
2. Configure environment variables
3. Deploy:

```bash
vercel --prod
```

### Docker

```bash
docker build -t ai-saas-dashboard .
docker run -p 3000:3000 ai-saas-dashboard
```

### Environment-Specific Notes

| Environment | Configuration |
|-------------|---------------|
| Development | Local Supabase, debug mode enabled |
| Staging | Separate Supabase project, reduced sampling |
| Production | Full Sentry tracing, optimized bundles |

## Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Performance tests
npm run test:performance
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [Vercel AI SDK](https://github.com/vercel/ai) for function calling patterns
- [shadcn/ui](https://ui.shadcn.com/) for component inspiration
- [Supabase](https://supabase.com/) for excellent documentation
- [Kysely](https://kysely.dev/) for type-safe SQL

---

Built with modern web technologies for production-ready quality.
