# Fazzaa Pro Complaint Management System - Design Guidelines

## Design Approach
**Reference-Based SaaS Dashboard**: Drawing inspiration from modern SaaS platforms like Linear, Stripe Dashboard, and Notion's clean data-dense interfaces, with Fazzaa Pro's distinctive blue branding.

## Brand Identity & Color System

**Primary Colors (User-Specified)**:
- Primary Blue: `#0066CC` - Main brand color, sidebar, primary buttons
- Secondary Blue: `#0099FF` - Accents, links, secondary elements  
- White: `#FFFFFF` - Backgrounds, cards, content areas
- Blue Gradient: `linear-gradient(135deg, #0066CC, #0099FF)` - Dashboard cards, feature highlights

**Functional Colors**:
- Success Green: `#10B981` - Resolved/Closed status
- Warning Orange: `#F59E0B` - Under Review/Pending status
- Danger Red: `#EF4444` - Urgent severity, Rejected status
- Gray Scale: `#F9FAFB` (bg), `#E5E7EB` (borders), `#6B7280` (text-secondary), `#111827` (text-primary)

## Typography System

**Font Stack**: 
- Primary: 'Inter', system-ui, sans-serif (via Google Fonts CDN)
- Monospace: 'JetBrains Mono' for IDs, technical data

**Hierarchy**:
- Page Titles: text-3xl, font-bold, text-gray-900
- Section Headers: text-2xl, font-semibold, text-gray-800
- Card Titles: text-xl, font-semibold, text-gray-900
- Subheadings: text-lg, font-medium, text-gray-700
- Body Text: text-base, text-gray-600
- Small Text: text-sm, text-gray-500
- Labels: text-sm, font-medium, text-gray-700

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Component padding: p-6 to p-8
- Section spacing: my-8 to my-12
- Card gaps: gap-6
- Form field spacing: space-y-4

**Grid Structure**:
- Dashboard Stats: 4-column grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Chart Section: 2-column grid (grid-cols-1 lg:grid-cols-2)
- Form Layout: Single column, max-w-4xl centered

**Main Layout**:
- Fixed Blue Sidebar: w-64, bg-gradient-to-b from-[#0066CC] to-[#0099FF], text-white
- Main Content Area: ml-64, min-h-screen, bg-gray-50
- Top Navbar: h-16, bg-white, border-b border-gray-200, shadow-sm
- Content Container: max-w-7xl mx-auto, p-6 to p-8

## Component Library

### Navigation (Sidebar)
- Logo area: h-16, centered, white text "Fazzaa Pro - فزّاع برو" in bold
- Navigation items: py-3 px-4, rounded-lg hover:bg-white/10 transition, active:bg-white/20, font-medium
- Icons: Use Heroicons (Home, Document, ChartBar, Cog)

### Dashboard Cards
- Background: white with shadow-md, rounded-xl
- Hover effect: shadow-lg, scale-[1.02], transition-all duration-200
- Stat cards: p-6, flex layout with icon + number + label
- Icon containers: w-12 h-12, rounded-full, gradient background
- Large numbers: text-3xl font-bold
- Labels: text-sm text-gray-600

### Data Tables
- Container: bg-white, rounded-xl, shadow-sm, overflow-hidden
- Header row: bg-gray-50, text-left, py-4 px-6, font-semibold text-gray-700, border-b
- Body rows: py-4 px-6, border-b border-gray-100, hover:bg-gray-50 transition
- Status badges: px-3 py-1, rounded-full, text-xs font-medium
  - New: bg-blue-100 text-blue-800
  - Under Review: bg-yellow-100 text-yellow-800
  - Resolved: bg-green-100 text-green-800
  - Closed: bg-gray-100 text-gray-800

### Forms
- Input fields: w-full, px-4 py-3, border border-gray-300, rounded-lg, focus:ring-2 focus:ring-[#0066CC] focus:border-transparent
- Labels: mb-2, text-sm font-medium text-gray-700
- Select dropdowns: Same styling as inputs
- Textarea: min-h-32, resize-y
- File upload: border-2 border-dashed border-gray-300, p-8, rounded-lg, hover:border-[#0099FF]

### Buttons
- Primary: bg-[#0066CC] hover:bg-[#0055AA], text-white, px-6 py-3, rounded-lg, font-medium, shadow-sm
- Secondary: bg-white border-2 border-[#0066CC], text-[#0066CC], hover:bg-gray-50
- Danger: bg-red-600 hover:bg-red-700, text-white
- Disabled: opacity-50 cursor-not-allowed

### Charts (Recharts)
- Container: bg-white, rounded-xl, shadow-sm, p-6
- Pie Chart: Custom colors matching complaint types, with legend
- Bar Chart: Blue gradient bars, responsive height (h-80)
- Tooltips: Custom styled with white background, shadow

### Filters & Search
- Search bar: w-full md:w-96, px-4 py-2, border rounded-lg, with search icon
- Filter buttons: inline-flex gap-2, px-4 py-2, rounded-lg, bg-gray-100, hover:bg-gray-200
- Active filter: bg-[#0066CC] text-white

## Animations & Interactions

**Keep Minimal - Only Where Valuable**:
- Card hover: scale and shadow transitions (duration-200)
- Button hover: brightness adjustment
- Page transitions: fade-in on load (opacity 0 to 1, duration-300)
- Dropdown menus: slide-down animation
- NO complex scroll animations or timeline effects

## Data Visualization

**Dashboard Charts**:
- Pie Chart (Complaint Types): Right side, colorful segments with legend below
- Bar Chart (Sources): Left side, gradient blue bars, horizontal labels
- Recent Complaints List: Full-width table below charts, showing last 10 entries

## Complaint Details Page

**Layout**:
- Two-column grid on desktop (grid-cols-1 lg:grid-cols-3)
- Main info: col-span-2 (left), Actions sidebar: col-span-1 (right)
- Timeline: Vertical line with status dots, left border-l-2 border-blue-500
- Attachments: Grid of thumbnail images, clickable for full view
- Notes section: Below main info, with add note form

## Reports Page

**Structure**:
- Date range selector: Top, inline with export button
- Stats grid: 3-column cards showing key metrics
- Charts: 2-column layout
- Export button: Top-right, primary blue styling with download icon

## Accessibility

- All interactive elements have focus states (ring-2 ring-offset-2)
- Color contrast meets WCAG AA standards
- Proper ARIA labels for icons and buttons
- Keyboard navigation supported throughout

## No Images Required
This is a data-dense admin dashboard - no hero images or marketing photography needed. Focus on clean data presentation, charts, and functional UI elements.