# Dashboard Design System

This document captures the visual language used across the admin dashboard.

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

- Body/UI font: `Inter, sans-serif`
- Heading font: `Manrope, sans-serif`
- Heading style:
  - Main page titles: `text-2xl sm:text-3xl font-bold`
  - Section headings: `text-lg` to `text-xl font-semibold/bold`
- Body style:
  - Default content text: `text-sm text-gray-600`
  - Long descriptive text: `text-sm leading-7 text-gray-600`
- Eyebrow labels:
  - Uppercase, Semi-bold, Wide tracking: around `0.3em` to `0.35em`
  - Often red: `#b62828`

## Color system

### Primary brand colors

- Primary dark: `#23411f` (main headings, dark text)
- Primary mid: `#3d5c33` (tailwind config extension)
- Primary deeper: `#1a2f16`
- Accent: `#8fa31e` (primary CTA, active pills/tabs)
- Accent hover: `#78871c`

### Surface colors

- App background: `#f6fdeb`
- Soft surface: `#fbfcf7`
- Container surface: `#f5faeb`
- Border base: `#dce6c1`

### Accent/support colors

- Brand red: `#b62828` (eyebrows, destructive)
- Soft red bg: `#fff4f4`
- Info blue bg: `#eef4ff`
- Warning gold bg: `#fbf6ea`

## Gradients

### Page background

```css
radial-gradient(circle at top, #fdf0f0 0%, #f6fbe9 35%, #edf4dc 100%)
```

### Hero gradient

```css
linear-gradient(135deg, #b62828 0%, #8fa31e 100%)
```

### Sidebar gradient

```css
linear-gradient(180deg, #23411f 0%, #3d601a 52%, #8fa31e 100%)
```

## Border & Radius

- Card border: `1px solid #dce6c1`
- Radius: `1.5rem` for cards, `2rem` for shells

## Shadows

- Card: `shadow-sm`
- Raised: `0 18px 60px rgba(77, 103, 22, 0.12)`

## Component patterns

### Buttons

- Primary: `bg-[#8fa31e] text-white`
- Secondary: `bg-white border-[#dce6c1] text-[#23411f]`

### Inputs

- Background: `#f8fbf1`
- Border: `#d9e2bc`
- Radius: `1rem`

### Cards

- `bg-white border-[#dce6c1] shadow-sm rounded-2xl`
