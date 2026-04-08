# Design System Reference

This document captures the visual language already used across the dashboard so we can build future pages with the same look and feel.

## Source of truth

The guidance below is derived from the dashboard implementation in:

- `client/src/pages/Dashboard.jsx`
- `client/src/components/DashSidebar.jsx`
- `client/src/components/Dashboards.jsx`
- `client/src/components/DashProfile.jsx`
- `client/src/components/DashUsers.jsx`
- `client/src/components/DashRestaurants.jsx`
- `client/src/components/DashCategories.jsx`
- `client/src/components/DashMenu.jsx`
- `client/src/components/DashReviews.jsx`
- `client/src/components/DashAuditLogs.jsx`
- `client/tailwind.config.js`
- `client/src/index.css`

## Core design direction

- Style mood: premium admin dashboard with natural olive tones, warm neutrals, and soft red accents.
- Brand personality: calm, trustworthy, operational, slightly upscale.
- Visual structure: large rounded surfaces, soft borders, gentle shadows, and light layered backgrounds.
- Layout behavior: roomy cards, compact controls, clear section hierarchy, responsive stacking from desktop to mobile.

## Typography

- Primary font: `Inter, sans-serif`
- Global source: `client/src/index.css`
- Heading style:
  - Main page titles: `text-2xl sm:text-3xl font-bold`
  - Section headings: `text-lg` to `text-xl font-semibold/bold`
- Body style:
  - Default content text: `text-sm text-gray-600`
  - Long descriptive text: `text-sm leading-7 text-gray-600`
- Eyebrow labels:
  - Uppercase
  - Semi-bold
  - Wide tracking: around `0.3em` to `0.35em`
  - Often red: `#b62828`

## Color system

### Primary brand colors

- Primary dark: `#23411f`
  - Main headings
  - Dark text
  - Dark hover state for outlined action buttons
- Primary mid: `#3d5c33`
  - Tailwind config extension
- Primary dark deeper: `#1a2f16`
  - Tailwind config extension
- Accent: `#8fa31e`
  - Primary CTA background
  - Active pills/tabs
  - Focus borders and rings
- Accent hover: `#78871c`
  - CTA hover state

### Surface colors

- App background: `#f6fdeb`
- Soft surface: `#fbfcf7`
- Container surface: `#f5faeb`
- Section tint: `#f8fbf1`
- Subtle highlight green: `#edf4dc`
- Border base: `#dce6c1`
- Soft border alt: `#ebf0d7`
- Soft border alt 2: `#e6eccf`
- Input border: `#d9e2bc`

### Accent/support colors

- Brand red: `#b62828`
  - Eyebrows
  - Gradient hero start
  - Destructive emphasis
- Soft red bg: `#fff4f4` / `#fff5f5`
- Red text: `#8e1d1d` / `#6f1b1b`
- Info blue bg: `#eef4ff`
- Info blue text: `#1f4f8c`
- Warning gold bg: `#fbf6ea`
- Warning gold text: `#6f5a12`
- Audit purple bg: `#f4f1ff`
- Audit purple text: `#5b3fb0`
- Link/filter blue: `#2563eb`
- Success/loading text green: `#4e5e20` / `#4d6518`

## Gradients

### Page background gradient

Use for full dashboard/page shells:

```css
radial-gradient(circle at top, #fdf0f0 0%, #f6fbe9 35%, #edf4dc 100%)
```

### Main hero gradient

Use for dashboard summary banners:

```css
linear-gradient(135deg, #b62828 0%, #8fa31e 100%)
```

### Profile hero variant

Use where a richer premium blend is needed:

```css
linear-gradient(135deg, #6b7d18 0%, #8fa31e 45%, #b62828 100%)
```

### Sidebar gradient

Use for dark navigation surfaces:

```css
linear-gradient(180deg, #23411f 0%, #3d601a 52%, #8fa31e 100%)
```

## Border system

- Standard card border: `1px solid #dce6c1`
- Secondary inner panel border: `1px solid #ebf0d7`
- Toolbar/input button border: `1px solid #e6eccf`
- Input border: `1px solid #d9e2bc`
- Dashed empty-state border: dashed `#dce6c1`
- Sidebar translucent border: `1px solid rgba(255,255,255,0.1)`

## Corner radius system

The dashboard leans heavily on rounded geometry.

- Main shell/sidebar radius: `2rem`
- Sticky top bar / hero panels: `1.75rem` to `2rem`
- Secondary panels/cards: `1.5rem`
- Inner stat blocks: `1.25rem` to `1.4rem`
- Inputs: `1rem`
- Pills/chips: fully rounded or `1rem+`
- Avatars/media tiles: `1.5rem` to `1.75rem`

Recommended standard set for reuse:

- `radius-xl`: `1rem`
- `radius-2xl`: `1.5rem`
- `radius-3xl`: `1.75rem`
- `radius-4xl`: `2rem`

## Shadow system

- Standard card shadow: `shadow-sm`
- Raised toolbar shadow:

```css
0 18px 60px rgba(77, 103, 22, 0.12)
```

- Large hero/card shadow:

```css
0 25px 80px rgba(60, 79, 25, 0.08)
```

- Sidebar shadow:

```css
0 20px 70px rgba(58, 79, 21, 0.18)
```

- Inner glow/shadow:
  - `shadow-inner` for gradient highlight panels and media frames

Design rule:

- Prefer soft, wide shadows over sharp elevation.
- Use only one strong shadow per section.
- Inner shadows are used sparingly to make premium blocks feel inset.

## Spacing system

Observed dashboard rhythm:

- Page section gap: `gap-5` / `space-y-5`
- Card internal spacing: `p-4` to `p-5`
- Large hero spacing: `p-5` to `p-7`
- Tight control spacing: `gap-2` / `gap-3`
- Standard grid spacing: `gap-4`

Recommended spacing tokens:

- `space-2`: `0.5rem`
- `space-3`: `0.75rem`
- `space-4`: `1rem`
- `space-5`: `1.25rem`
- `space-6`: `1.5rem`

## Component patterns

### 1. Page shell

- Use a light radial background.
- Keep content inside `max-w-[1600px]`.
- Desktop layout: left sidebar + right content column.
- Mobile layout: slide-in sidebar drawer with dark overlay.

### 2. Sidebar

- Dark gradient background.
- Large rounded outer shell.
- Glass-like user summary block with `bg-white/10`, `border-white/10`, `backdrop-blur`.
- Active nav item:
  - White background
  - Dark green text
  - Soft border
  - `shadow-md`
- Inactive nav item:
  - Transparent
  - White text at reduced opacity
  - White translucent hover fill

### 3. Top toolbar/header

- Sticky
- Semi-transparent white background: `bg-white/80`
- `backdrop-blur`
- Large rounded corners
- Soft green-tinted shadow
- Includes:
  - eyebrow label
  - page title
  - back button
  - tab pills

### 4. Cards

- Base pattern:

```text
bg-white + border-[#dce6c1] + shadow-sm + radius around 1.5rem
```

- Premium hero card:

```text
bg-white + border-[#dce6c1] + large soft shadow + internal gradient panel
```

### 5. Buttons

- Primary CTA:
  - Background `#8fa31e`
  - Hover `#78871c`
  - White text
- Secondary light action:
  - Background `#f7faef` or white
  - Text `#23411f`
  - Border `#d8dfc0` or `#e6eccf`
  - Hover switches to dark green background with white text for stronger actions
- Destructive:
  - Red background, usually Flowbite `failure` or `bg-red-600`
- Tab/button filters:
  - Active: bold dark green
  - Inactive: blue link-style text `#2563eb`

### 6. Inputs

- Background: `#f8fbf1` or white
- Border: `#d9e2bc`
- Radius: `1rem`
- Text: `#23411f`
- Focus:
  - Border `#8fa31e`
  - White background
  - Ring in pale olive: `#dbe9ab` at reduced opacity

Recommended reusable input class shape:

```text
rounded-[1rem] border border-[#d9e2bc] bg-[#f8fbf1] px-4 py-3 text-sm text-[#23411f] focus:border-[#8fa31e] focus:bg-white focus:ring-4 focus:ring-[#dbe9ab]/50
```

### 7. Status/info panels

Use soft tinted backgrounds with matching text colors:

- Success/operational: `bg-[#f5faeb] text-[#4d6518]`
- Alert/error: `bg-[#fff5f5] text-[#6f1b1b]` or `#8e1d1d`
- Info: `bg-[#eef4ff] text-[#1f4f8c]`
- Warning: `bg-[#fbf6ea] text-[#6f5a12]`
- Audit/special: `bg-[#f4f1ff] text-[#5b3fb0]`

### 8. Tables and list panels

- Desktop tables live inside white cards.
- Rows use clear text hierarchy:
  - Primary text `#23411f`
  - Secondary metadata `text-gray-500`
- Empty states:
  - Dashed border
  - `bg-[#fbfcf7]`
  - Rounded `1.5rem`
- Loading states:
  - `bg-[#f7faef]`
  - text `#4e5e20`
  - spinner + short message

### 9. Media treatment

- Image frames use soft green surfaces.
- Missing-image placeholders use initials or icons on `#edf4dc` / `#f7faef`.
- Upload/preview containers often use `shadow-inner`.
- Hover overlays use dark translucent layers with blurred glass chips.

### 10. Badges and pills

- Role/status badges use Flowbite badges plus custom borders where needed.
- Dashboard tab pills:
  - Active: accent fill with white text
  - Inactive: pale green fill with olive text
- Role pills often use tinted backgrounds rather than neutral gray.

## Responsive behavior

- Sidebar stays fixed on desktop and becomes an overlay drawer on mobile.
- Toolbar actions collapse well into stacked rows.
- Data-heavy layouts switch from tables on desktop to card/list blocks on smaller screens.
- Most major sections use `xl:grid-cols[...]` for asymmetric editorial layouts.

## Reusable page recipe

For any new admin page, follow this structure:

1. Use the dashboard page background gradient.
2. Add a sticky top header or local intro card.
3. Start with an eyebrow label in `#b62828`.
4. Use a strong heading in `#23411f`.
5. Place metrics or summary cards near the top.
6. Wrap forms, filters, tables, and lists in white bordered cards.
7. Use `#8fa31e` for primary actions and focus states.
8. Reserve red for destructive states and warnings, not for primary actions.
9. Keep radii large and shadows soft.
10. Prefer soft green surfaces over plain gray UI.

## Suggested token map for future implementation

If we later move this into code tokens, use names like:

```text
color-primary = #23411f
color-primary-light = #3d5c33
color-accent = #8fa31e
color-accent-hover = #78871c
color-danger = #b62828
color-surface = #fbfcf7
color-surface-soft = #f5faeb
color-border = #dce6c1
color-border-soft = #ebf0d7
color-text = #23411f
color-text-muted = #6b7280
radius-input = 1rem
radius-card = 1.5rem
radius-hero = 1.75rem
radius-shell = 2rem
shadow-card = shadow-sm
shadow-raised = 0 18px 60px rgba(77, 103, 22, 0.12)
shadow-hero = 0 25px 80px rgba(60, 79, 25, 0.08)
```

## Do and don't

Do:

- Keep pages bright, soft, and olive-led.
- Mix white cards with subtle green-tinted surfaces.
- Use large radii consistently.
- Use gradients for hero and navigation surfaces.
- Keep text hierarchy strong and readable.

Don't:

- Introduce harsh black shadows.
- Use sharp rectangular containers.
- Replace the olive accent with unrelated bright colors.
- Default to plain gray admin styling.
- Overuse red outside alerts, danger actions, and eyebrows.

## Recommendation

The next good step is to extract these choices into shared frontend tokens or utility classes so new pages can reuse the system without repeating raw hex values in every component.
