# Menu Management UI Design

## Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  Header: "Menu Operations" + Description               │
├──────────────────────────┬──────────────────────────────┤
│  Restaurant Selector     │  Create Menu Form (if admin) │
│  [Select Restaurant ▼]   │  Category: [Select ▼]       │
│                          │  [Create Menu] Button         │
├──────────────────────────┴──────────────────────────────┤
│  Stats Bar                                              │
│  ┌─────────┬─────────────────┬─────────────┐          │
│  │ Menus   │ Restaurant Name │ Categories  │          │
│  │   0     │    Test         │     1       │          │
│  └─────────┴─────────────────┴─────────────┘          │
└─────────────────────────────────────────────────────────┘

Active Menus Section
┌─────────────────────────────────────────────────────────┐
│  [Heading: Active Menus] [Loading Spinner]              │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐│
│  │ Menu Card (per category)                            ││
│  │ ┌─────────────────────────────────────────────────┐ ││
│  │ │ [Category Name] [Status Badge]                  │ ││
│  │ │ X menu items                                     │ ││
│  │ │                          [Add Item] [Delete]     │ ││
│  │ └─────────────────────────────────────────────────┘ ││
│  │                                                     ││
│  │ Table: Item | Price | Status | Actions             ││
│  │ ───────────────────────────────────────────────    ││
│  │ Burger    | £8.99  | ✅      | [Toggle]             ││
│  │ Fries     | £3.99  | ✅      | [Toggle]            ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Restaurant Selector

- **Type**: Dropdown (Select)
- **Label**: "Restaurant"
- **States**: Enabled / Disabled (if no restaurants)
- **Behavior**: Changing triggers menu reload

### 2. Stats Cards (3-column grid)

| Card       | Background            | Label Color | Value Color |
| ---------- | --------------------- | ----------- | ----------- |
| Menus      | #f5faeb (light green) | #7e9128     | #23411f     |
| Restaurant | #fff4f4 (light red)   | #b62828     | #5c1111     |
| Categories | #f8f7f1 (light gray)  | #7a7a6b     | #23411f     |

### 3. Create Menu Form (Admin only)

- **Visible**: Only if `canCreateMenu` permission
- **Fields**:
  - Category dropdown (required)
  - Submit button: "Create menu"
- **Disabled when**: No restaurant or category selected

### 4. Menu Card (per category)

- **Border**: #e7edd2, Background: #fbfcf7
- **Border radius**: 1.75rem
- **Padding**: 1.25rem (mobile), 1.5rem (desktop)

#### Header Section

- Category name (bold, #23411f)
- Status badge:
  - Published: green
  - Draft: warning (yellow)
  - Blocked: red
- Item count text

#### Action Buttons

| Button   | Condition     | Color           |
| -------- | ------------- | --------------- |
| Add Item | canAddItem    | Green (#8fa31e) |
| Delete   | canDeleteMenu | Red (failure)   |

#### Item Table (Desktop only)

- Columns: Item, Price, Status, Actions
- Row hover effect
- Mobile: Hidden, show item count only

---

## Modal: Add Menu Item

```
┌─────────────────────────────────┐
│  Add menu item            [X]  │
├─────────────────────────────────┤
│  Name: [________________]      │
│                                 │
│  Description:                   │
│  [________________________]    │
│  [________________________]    │
│                                 │
│  ┌────────────┐ ┌────────────┐ │
│  │ Price      │ │ Image URL  │ │
│  │ [________] │ │ [________] │ │
│  └────────────┘ └────────────┘ │
│                                 │
│  Availability:                 │
│  [Available ▼]                 │
│                                 │
├─────────────────────────────────┤
│  [Add Item]        [Cancel]    │
└─────────────────────────────────┘
```

### Form Fields

| Field        | Type               | Required | Validation |
| ------------ | ------------------ | -------- | ---------- |
| Name         | TextInput          | Yes      | min 1 char |
| Description  | Textarea           | No       | -          |
| Price        | TextInput (number) | Yes      | min 0      |
| Image URL    | TextInput          | No       | valid URL  |
| Availability | Select             | No       | -          |

### Buttons

- **Add Item**: Green background (#8fa31e)
- **Cancel**: Gray, closes modal

---

## Color Palette

| Element        | Color Code | Usage               |
| -------------- | ---------- | ------------------- |
| Primary Green  | #23411f    | Headings, text      |
| Accent Green   | #8fa31e    | Buttons, highlights |
| Hover Green    | #78871c    | Button hover        |
| Light Green    | #f5faeb    | Stats card bg       |
| Light Red      | #fff4f4    | Stats card bg       |
| Border         | #dce6c1    | Card borders        |
| Category Badge | #7e9128    | Category label      |

---

## Responsive Breakpoints

| Breakpoint | Width      | Adjustments            |
| ---------- | ---------- | ---------------------- |
| Mobile     | < 640px    | Stack form, hide table |
| Tablet     | 640-1024px | 2-column grid          |
| Desktop    | > 1024px   | Full layout            |

---

## User Flows

### Admin Creates Menu

1. Select restaurant from dropdown
2. Select category from dropdown
3. Click "Create menu"
4. Success message appears
5. New menu card shows in list (status: draft)

### Store Manager Adds Item

1. View menus (read-only for menu creation)
2. Click "Add Item" on menu card
3. Fill in item details
4. Click "Add Item"
5. Item appears in table

### Toggle Item Availability

1. Click "Toggle availability" on item row
2. Status badge updates instantly
3. Public menu reflects change

---

## Empty States

### No Restaurant Selected

- Show placeholder in stats: "Not selected"

### No Menus

- Show empty list message
- Prompt to create menu (if admin)

### No Items in Menu

- Show "0 menu items" text
- Prompt to add items (if has permission)

---

## Loading States

- **Initial load**: Spinner in header area
- **Submitting**: Button shows processing state
- **Error**: Alert banner (red)
- **Success**: Alert banner (green), auto-dismiss after 3s
