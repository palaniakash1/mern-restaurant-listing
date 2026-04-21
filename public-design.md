# Public-Facing Design System: EatWisely

This document captures the visual language for public-facing pages (home, search, restaurant details).

## Source of truth

The guidance below is derived from:

- `client/src/components/public/CinematicBanner.jsx`
- `client/src/components/public/FeaturedByCategory.jsx`
- `client/src/components/public/FeaturedByMenu.jsx`
- `client/src/components/public/NearbyRestaurants.jsx`
- `client/src/pages/Home.jsx`
- `screenshots/code.html`
- `screenshots/DESIGN.md`

## Core design direction

- **Style mood:** Premium editorial dining discovery with botanical warmth
- **Brand personality:** Sophisticated, inviting, natural, slightly upscale
- **Theme:** "The Botanical Atelier" - rejects clinical coldness for organic warmth
- **Visual structure:** Extreme corner radii, tonal depth over structural lines, intentional asymmetry
- **Layout:** Oversized hero surfaces, generous negative space, curated feel

## Typography

- Body/UI font: `Inter, sans-serif`
- Heading font: `Manrope, sans-serif`
- Display/Hero: `text-5xl lg:text-7xl font-extrabold`
- Section titles: `text-2xl sm:text-3xl font-bold`
- Eyebrow labels: uppercase, semi-bold, wide tracking `0.2em`, red `#bf1e18`

## Color system

### Primary brand colors

- Primary (Red): `#bf1e18` - Main CTA, highlights
- Primary lighter: `#cc0001`
- Primary darker: `#df2921`
- Green accent: `#8fa31e` - Secondary actions, success states
- Green dark: `#576500`

### Surface colors

- Background: `#fff8f7` (warm off-white)
- Surface container lowest: `#ffffff`
- Surface container low: `#fff1f0`
- Surface container: `#f8e0df`
- Surface bright: `#fff8f7`

### On-colors

- On primary: `#ffffff`
- On surface: `#201a1a`
- On surface variant: `#534342`

### Border colors

- Outline: `#857371`
- Outline variant: `#d8c2c0`

## Hero/Banner Section (CinematicBanner)

### Background gradient

```css
bg-gradient-to-br from-[#c31e18] to-[#df2921]
```

### Decorative blur elements

- Top-right: `-top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl`
- Bottom-left: `-bottom-24 -left-24 w-64 h-64 bg-black/10 rounded-full blur-2xl`

### Search cluster

- White background with `rounded-full`
- Shadow: `shadow-2xl`
- Padding: `p-2`
- Gap: `gap-2`

### Allergen buttons

- Size: `w-24 h-24` (96x96px)
- Shape: `rounded-2xl`
- Default: `bg-white/10 border border-white/30 text-white`
- Selected: `bg-[#bf1e18] text-white border-transparent`
- Hover: `hover:bg-white hover:text-[#bf1e18]`
- Layout: vertical flex (emoji on top, label on bottom)
- Label: `text-[10px] font-bold uppercase tracking-tight`

### Dietary filter buttons

- Size: `w-14 h-14` (56x56px)
- Shape: `rounded-full`
- Default: `bg-white text-[#bf1e18]`
- Selected: `bg-[#bf1e18] text-white`
- Icon only (no label in button)

### "I am allergic to" tooltip

- Position: absolute, `-top-16`, centered
- Style: `bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-lg`
- Text: `text-sm font-bold text-[#bf1e18]`
- Arrow: `rotate-45` small square

## Categories Section (FeaturedByCategory)

### Layout

- Horizontal scrollable: `flex gap-8 overflow-x-auto`
- Hide scrollbar: `scrollbar-hide`

### Category item

- Container: `flex flex-col items-center gap-4 group cursor-pointer`
- Image wrapper: `w-28 h-28 rounded-full overflow-hidden border-4 border-transparent`
- Hover: `group-hover:border-[#bf1e18] transition-all duration-300`
- Image: `w-full h-full object-cover group-hover:scale-110 transition-transform`
- Label: `font-bold text-[#534342] group-hover:text-[#bf1e18]`

### Fallback images

```javascript
const categoryImages = {
  Italian:
    'https://images.unsplash.com/photo-1498579150354-977fffb85898?auto=format&fit=crop&w=600&q=80',
  Japanese:
    'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?auto=format&fit=crop&w=600&q=80',
  Indian:
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80'
  // ... more categories
};
```

## Popular Dishes Section (FeaturedByMenu)

### Section background

```css
bg-[#fff1f0] rounded-xl
```

### Dish card

- Background: `bg-white border border-[#d8c2c0]/10`
- Image height: `h-48`
- Hover: `group-hover:scale-110 transition-transform duration-500`
- Overlay: `bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.6))]`

### Rating badge

```css
bg-[#bf1e18]/10 px-2 py-0.5 rounded text-[#bf1e18] font-bold text-sm
```

## Nearby Restaurants Section (NearbyRestaurants)

### Section wrapper

```css
max-w-7xl mx-auto px-6 py-16
```

### Restaurant card

- Image height: `h-64 rounded-xl`
- Overlay gradient: `bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(10,14,8,0.75))]`
- Rating badge: `bg-[#8fa31e]/90 px-3 py-1.5 text-xs font-bold text-white`

## Shared Component Patterns

### Primary button

```css
bg-[#bf1e18] text-white px-10 py-4 rounded-full font-bold hover:opacity-90 transition-all hover:scale-105 active:scale-95 shadow-lg
```

### Secondary button

```css
border border-[#dce6c1] px-4 py-2 text-sm font-medium text-[#23411f] hover:bg-[#dce6c1]/30
```

### Section eyebrow

```css
text-[#bf1e18] font-bold text-xs uppercase tracking-tighter
```

### Section heading

```css
font-headline text-3xl font-bold text-[#23411f]
```

### Card styles

```css
bg-white rounded-lg p-4 shadow-sm border border-outline-variant/10
```

## Responsive behavior

- Hero: Full-width on mobile, centered with max-width on desktop
- Search bar: Stacks vertically on mobile, horizontal on desktop
- Categories: Horizontal scroll on mobile, grid on desktop
- Restaurant cards: 1 column mobile, 2 tablet, 3 desktop

## Do's and Don'ts

### Do:

- Use extreme corner radii (full rounded, 2rem+)
- Use warm off-white backgrounds instead of pure white
- Include decorative blur elements in hero sections
- Use vertical allergen buttons with emoji + label
- Keep text hierarchy strong with Manrope for headings

### Don't:

- Use sharp 90-degree corners
- Use pure black text - use `#201a1a` or `#534342`
- Use clinical gray backgrounds - prefer warm tones
- Overwhelm with borders - use background color shifts
- Use standard admin styling - this is editorial/dining focused
