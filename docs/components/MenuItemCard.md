# MenuItemCard Component

A reusable card component for displaying menu items on the restaurant detail page.

## Location

`client/src/components/public/MenuItemCard.jsx`

## Props

| Prop              | Type     | Required | Description                                                                                    |
| ----------------- | -------- | -------- | ---------------------------------------------------------------------------------------------- |
| item              | object   | Yes      | The menu item object containing name, description, price, image, allergens, dietary, nutrition |
| selectedAllergens | array    | No       | Array of selected allergen IDs to check against                                                |
| selectedDiet      | array    | No       | Array of selected dietary preference IDs to check against                                      |
| onAddToCart       | function | No       | Callback when user clicks add to cart button                                                   |

## Helper Functions

### isItemUnsuitable(item, allergens, dietary)

Checks if a menu item is unsuitable based on user's allergen and dietary selections.

**Parameters:**

- `item`: Menu item object
- `allergens`: Array of allergen IDs
- `dietary`: Array of dietary preference IDs

**Returns:** boolean - true if item is unsuitable

### getItemBadges(item)

Returns dietary badge labels for a menu item.

**Parameters:**

- `item`: Menu item object

**Returns:** array of badge strings (e.g., ['Vegan', 'GF'])

### getItemAllergens(item)

Returns all allergens present in a menu item.

**Parameters:**

- `item`: Menu item object

**Returns:** array of allergen ID strings

### getItemNutrition(item)

Returns nutrition information for a menu item.

**Parameters:**

- `item`: Menu item object

**Returns:** object with nutrition key-value pairs

## Visual States

### Suitable Item

- Background: white gradient
- Border: light green `#ebf0d7`
- Text: dark green `#23411f`
- Price: green `#2f6a34`

### Not Suitable Item

- Background: light gray `#f7f5f4`
- Border: gray `#d0ccc8`
- Image, name, description, price, badges: grayscale
- "Not Suitable" badge: bright red `#bf1e18` stands out

## Usage

```jsx
import { MenuItemCard } from './components/public/MenuItemCard';

<MenuItemCard
  item={menuItem}
  selectedAllergens={['gluten', 'dairy']}
  selectedDiet={['vegan']}
  onAddToCart={(item) => handleAddToCart(item)}
/>;
```

## Design Patterns (from public-design.md)

- Card corners: `rounded-[1.2rem]`
- Border: `shadow-[0_4px_16px_rgba(64,48,20,0.04)]`
- Image height: `h-32`
- Padding: `p-3`
- Allergen/nutrition expand buttons: `text-[10px] font-semibold uppercase tracking-[0.18em]`
- Badges: `rounded-full bg-[#edf3e4] px-2 py-0.5 text-[9px] uppercase`
- Add button: `!bg-[#1f2e17] text-white rounded-full`
