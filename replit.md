# Fazzaa Pro Complaint Management System

## Overview

Fazzaa Pro Complaint Management System is a comprehensive web-based platform for tracking, managing, and resolving customer complaints. The application provides an administrative dashboard for internal teams to collect complaints from multiple sources, monitor their status, analyze trends, and generate reports. Built with a modern tech stack, it features a clean, professional UI inspired by SaaS platforms like Linear and Stripe, using Fazzaa Pro's distinctive blue branding (#0066CC and #0099FF).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **Form Handling**: React Hook Form with Zod schema validation via @hookform/resolvers
- **UI Component Library**: Radix UI primitives with shadcn/ui component system
- **Styling**: Tailwind CSS with custom design tokens matching Fazzaa Pro brand identity

**Design System**:
- Custom color palette defined in CSS variables (HSL format) with light/dark mode support
- Brand colors: Primary Blue (#0066CC), Secondary Blue (#0099FF), White backgrounds
- Typography: Inter font family for UI, with monospace fonts for technical data
- Component variants using class-variance-authority (CVA) for consistent styling
- Responsive grid layouts with mobile-first approach

**Key Pages**:
- Dashboard: Statistics overview with charts (Recharts library for data visualization)
- Complaints List: Filterable/searchable table with pagination
- Complaint Form: Create/edit complaints with file uploads
- Complaint Details: Full complaint view with notes and status history
- Reports: Analytics and data export functionality

### Backend Architecture

**Framework**: Express.js (Node.js) with TypeScript
- **Build System**: esbuild for server bundling, Vite for client bundling
- **File Uploads**: Multer middleware for handling multipart/form-data
- **Development**: Hot module replacement via Vite in development mode

**API Design**:
- RESTful endpoints under `/api` prefix
- JSON request/response format
- File serving for uploaded attachments via `/uploads` route
- Static file serving for production build

**Data Storage**:
- In-memory storage implementation (MemStorage class) as primary data layer
- Prepared for Drizzle ORM integration with PostgreSQL (Neon serverless)
- Schema definitions using Zod for runtime validation
- Seed data included for development/demo purposes

**Data Models**:
- Complaints: source, type, severity, status, customer info, attachments
- Notes: Internal comments attached to complaints
- Status Changes: Audit trail for complaint status transitions
- Dashboard Stats: Aggregated metrics for overview

### External Dependencies

**Database (Configured but Optional)**:
- Neon Serverless PostgreSQL via @neondatabase/serverless
- Drizzle ORM for type-safe database queries
- Connection configured via DATABASE_URL environment variable
- Migration support through drizzle-kit

**UI Libraries**:
- Radix UI: Accessible, unstyled component primitives (@radix-ui/react-*)
- Recharts: Composable charting library for dashboard visualizations
- Lucide React: Icon library
- date-fns: Date manipulation and formatting

**Development Tools**:
- Vite: Frontend build tool with HMR
- TypeScript: Type safety across frontend and backend
- Tailwind CSS: Utility-first CSS framework
- PostCSS with Autoprefixer: CSS processing

**Build & Deployment**:
- Production build creates bundled server (dist/index.cjs) and client assets (dist/public)
- Server bundles select dependencies (allowlist) to reduce cold start times
- Environment-based configuration (NODE_ENV)

**File Storage**:
- Local filesystem storage in `/uploads` directory
- Multer configuration: 10MB file size limit, timestamped unique filenames
- Static file serving with CORS headers for uploaded content

**Key Architectural Decisions**:
- **Memory Storage**: Current implementation uses in-memory storage for simplicity and fast development. This provides immediate functionality without database setup, with clear migration path to PostgreSQL via Drizzle ORM.
- **Monorepo Structure**: Shared schema definitions between client and server via `@shared` import alias, ensuring type consistency.
- **Component-First UI**: Leveraging shadcn/ui pattern of copy-paste components built on Radix UI, allowing full customization while maintaining accessibility.
- **No Authentication**: Designed as internal admin tool with direct access (no user/permission system), simplifying deployment for trusted environments.