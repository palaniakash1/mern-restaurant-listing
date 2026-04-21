# Public-Facing Design System: EatWisely

This document captures the visual language for public-facing pages (home, search, restaurant details).

## IMPORTANT: Use !important for all colors

**All color classes must use !important to ensure they override any default styles:**

```css
/* Wrong */
bg-[#fff8f7] text-[#bf1e18]

/* Correct */
!bg-[#fff8f7] !text-[#bf1e18]
```

This applies to ALL color properties:
- background colors (bg-*)
- text colors (text-*)
- border colors (border-*)
- fill colors
- stroke colors

## Source of truth

The guidance below is derived from:

- `client/src/components/public/CinematicBanner.jsx`
- `client/src/components/public/FeaturedByCategory.jsx`
- `client/src/components/public/FeaturedByMenu.jsx`
- `client/src/components/public/NearbyRestaurants.jsx`
- `client/src/pages/Home.jsx`
- `client/src/pages/Restaurants.jsx`
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

## Search Suggestions Dropdown

### Trigger behavior

- Show dropdown on input focus when there's text
- Debounce API calls by 300ms
- Close dropdown on click outside

### Dropdown styling

```css
absolute top-full left-0 right-0 mt-1 !bg-white rounded-xl shadow-2xl z-50 max-h-80 overflow-auto
```

### Suggestion item

- Layout: flex, justify-between
- Text: `font-medium !text-[#201a1a]`
- Sublabel: `text-xs !text-[#534342] ml-2`
- Hover: `hover:!bg-[#fff1f0]`
- Arrow icon: `HiArrowRight !text-[#534342]`

### Click behavior

- Restaurant suggestion: navigate directly to restaurant page
- Dish/Menu/Category: fill the search input, close dropdown (user clicks Search to navigate)

## Hero/Banner Section (CinematicBanner)

### Background gradient

```css
!bg-gradient-to-br from-[#c31e18] to-[#df2921]
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
- Selected: `!bg-[#bf1e18] !text-white border-transparent`
- Hover: `hover:!bg-white hover:!text-[#bf1e18]`
- Layout: vertical flex (emoji on top, label on bottom)
- Label: `text-[10px] font-bold uppercase tracking-tight`

### Dietary filter buttons

- Size: `w-14 h-14` (56x56px)
- Shape: `rounded-full`
- Default: `!bg-white !text-[#bf1e18]`
- Selected: `!bg-[#bf1e18] !text-white`
- Icon only (no label in button)

### "I am allergic to" tooltip

- Position: absolute, `-top-16`, centered
- Style: `!bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-lg`
- Text: `!text-[#bf1e18] font-bold`
- Arrow: `rotate-45` small square

## Categories Section (FeaturedByCategory)

### Layout

- Horizontal scrollable: `flex gap-8 overflow-x-auto`
- Hide scrollbar: `scrollbar-hide`

### Category item

- Container: `flex flex-col items-center gap-4 group cursor-pointer`
- Image wrapper: `w-28 h-28 rounded-full overflow-hidden border-4 border-transparent`
- Hover: `group-hover:!border-[#bf1e18] transition-all duration-300`
- Image: `w-full h-full object-cover group-hover:scale-110 transition-transform`
- Label: `font-bold !text-[#534342] group-hover:!text-[#bf1e18]`

## Popular Dishes Section (FeaturedByMenu)

### Section background

```css
!bg-[#fff1f0] rounded-xl
```

### Dish card

- Background: `!bg-white border border-[#d8c2c0]/10`
- Image height: `h-48`
- Hover: `group-hover:scale-110 transition-transform duration-500`
- Overlay: `bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.6))]`

### Rating badge

```css
!bg-[#bf1e18]/10 px-2 py-0.5 rounded !text-[#bf1e18] font-bold text-sm
```

## Nearby Restaurants Section (NearbyRestaurants)

### Section wrapper

```css
max-w-7xl mx-auto px-6 py-16
```

### Restaurant card

- Image height: `h-64 rounded-xl`
- Overlay gradient: `bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(10,14,8,0.75))]`
- Rating badge: `!bg-[#8fa31e]/90 px-3 py-1.5 text-xs font-bold !text-white`

## Search Results Page (SearchResults.jsx)

### Hero section

- Background: `!bg-gradient-to-br from-[#c31e18] to-[#df2921]`
- Decorative blur: same as CinematicBanner
- Padding: `p-8 lg:p-12`
- Title: `font-[Manrope] text-3xl lg:text-5xl font-extrabold !text-white`

### Search bar

- White background with `rounded-full`
- Shadow: `shadow-2xl`
- Location + Search inputs in row
- Search button: `!bg-[#bf1e18] !text-white rounded-full`

### Active filter badges

- Style: `!bg-white/20 !text-white px-3 py-1 rounded-full text-xs font-medium`
- Remove button: `×` on hover

### Menu item card

- Background: `!bg-white rounded-xl`
- Border: `border border-[#d8c2c0]/30`
- Hover: `hover:border-[#bf1e18] hover:shadow-lg`
- Price: `!text-[#bf1e18] font-semibold`
- Arrow: `!text-[#bf1e18] h-4 w-4 opacity-0 group-hover:opacity-100`

### Section heading

- Font: `font-[Manrope] text-xl sm:text-2xl font-bold`
- Color: `!text-[#201a1a]`

## Restaurants Listing Page (Restaurants.jsx)

### Page background

```css
!bg-[#fff8f7] min-h-screen
```

### Hero header

- Background: `!bg-gradient-to-br from-[#c31e18] to-[#df2921]`
- Height: `h-[50vh] min-h-[400px]`
- Title: `!text-white font-[Manrope] text-5xl md:text-7xl font-extrabold`
- Subtitle: `!text-white/90 uppercase tracking-widest`

### Search bar container

- Background: `!bg-white/95 backdrop-blur-md`
- Border: `border border-[#d8c2c0]/30`
- Radius: `rounded-2xl`
- Shadow: `shadow-xl`

### Search input

- Background: `!bg-[#fff8f7]`
- Border: `border border-[#d8c2c0]`
- Text: `!text-[#201a1a]`
- Placeholder: `!text-[#534342]`
- Focus: `focus:!border-[#bf1e18] focus:!ring-[#bf1e18]/20`

### Filter select

- Same as search input
- Appearance: `appearance-none`

### Results heading

- Title: `!text-[#201a1a] font-[Manrope] text-2xl sm:text-3xl font-bold`
- Subtitle: `!text-[#534342]`

### Featured restaurant card

- Background: `!bg-white`
- Border: `border border-[#d8c2c0]/30`
- Radius: `rounded-xl`
- Image height: `h-64 lg:h-72`
- Hover: `hover:shadow-xl transition-all`
- Badge (Editor's Pick): `!bg-[#bf1e18] !text-white`
- Category tag: `!bg-[#fff1f0] !text-[#bf1e18]`
- Rating: `!text-[#bf1e18]`
- View button: `!bg-[#bf1e18] !text-white rounded-full`

### Regular restaurant card

- Similar to featured but smaller
- Image height: `h-56`
- Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

### Empty state

- Icon container: `!bg-[#fff1f0] border-2 border-dashed border-[#d8c2c0]`
- Icon: `!text-[#bf1e18]`
- Title: `!text-[#201a1a]`
- Text: `!text-[#534342]`

## Shared Component Patterns

### Primary button

```css
!bg-[#bf1e18] !text-white px-6 py-3 rounded-full font-bold hover:opacity-90 transition-all hover:scale-105 active:scale-95 shadow-lg
```

### Secondary button

```css
border border-[#d8c2c0] !text-[#bf1e18] px-4 py-2 rounded-full font-medium hover:!bg-[#fff1f0]
```

### Section eyebrow

```css
!text-[#bf1e18] font-bold text-xs uppercase tracking-wider
```

### Section heading

```css
font-[Manrope] text-2xl sm:text-3xl font-bold !text-[#201a1a]
```

### Card styles

```css
!bg-white rounded-xl p-4 shadow-lg border border-[#d8c2c0]/30
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
- ALWAYS use !important for all colors

### Don't:

- Use sharp 90-degree corners
- Use pure black text - use `#201a1a` or `#534342`
- Use clinical gray backgrounds - prefer warm tones
- Overwhelm with borders - use background color shifts
- Use standard admin styling - this is editorial/dining focused
- Forget to use !important for colors
