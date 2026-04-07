# Restaurant Menu Module - Design Document

## Overview

The Restaurant Menu module provides a comprehensive menu management system for a MERN stack restaurant platform. It supports multiple restaurants with menus organized by categories, includes advanced features like nutritional information, allergens, upsells, and provides proper access control for different user roles.

---

## Architecture

### Data Model

```
Restaurant (1) ──────< (many) Menu (1) ──────< (many) MenuItem
                         │
                         └─────> Category (1)
```

### Key Relationships

| Relationship      | Type        | Description                                              |
| ----------------- | ----------- | -------------------------------------------------------- |
| Restaurant → Menu | One-to-Many | Each restaurant can have multiple menus                  |
| Category → Menu   | One-to-One  | One menu per category per restaurant (unique constraint) |
| Menu → MenuItem   | One-to-Many | Embedded array of items                                  |

---

## Schema Design

### Menu Schema

```javascript
{
  restaurantId: ObjectId (ref: Restaurant, required, indexed)
  categoryId: ObjectId (ref: Category, required, indexed)
  items: [MenuItem] (embedded array)
  isActive: Boolean (default: true, indexed) // Soft delete flag
  status: Enum ['draft', 'published', 'blocked'] (default: 'draft', indexed)
  createdAt: Date
  updatedAt: Date
}
```

**Indexes:**

- `{ status: 1, isActive: 1 }` - Compound index for queries
- `{ restaurantId: 1, categoryId: 1 }` - Unique constraint

### MenuItem Schema (Embedded)

```javascript
{
  name: String (required, trimmed)
  description: String
  image: String (URL)
  price: Number (required, non-negative)
  dietary: {
    vegetarian: Boolean (default: false)
    vegan: Boolean (default: false)
  }
  ingredients: [{
    name: String (required)
    allergens: Enum ['gluten','egg','fish','crustaceans','molluscs','milk','peanut','tree_nuts','sesame','soya','celery','mustard','sulphites','lupin']
    strict: Boolean (default: false) // Cannot be removed
    removable: Boolean (default: true)
  }]
  nutrition: {
    calories: { value: Number, level: Enum ['green','amber','red'] }
    fat: { value: Number, level: Enum ['green','amber','red'] }
    saturates: { value: Number, level: Enum ['green','amber','red'] }
    sugar: { value: Number, level: Enum ['green','amber','red'] }
    salt: { value: Number, level: Enum ['green','amber','red'] }
  }
  upsells: [{
    label: String (required)
    price: Number (required)
  }]
  isMeal: Boolean (default: false)
  isAvailable: Boolean (default: true)
  order: Number (default: 0)
  isActive: Boolean (default: true) // Item-level soft delete
  deletedAt: Date
  deletedBy: ObjectId (ref: User)
}
```

---

## API Endpoints

### Menu CRUD

| Method | Endpoint                                  | Auth       | Description                     |
| ------ | ----------------------------------------- | ---------- | ------------------------------- |
| POST   | `/api/menus`                              | admin+     | Create menu for category        |
| GET    | `/api/menus/restaurant/:restaurantId/all` | protected  | Get all menus (including draft) |
| GET    | `/api/menus/restaurant/:restaurantId`     | public     | Get published menus (public)    |
| GET    | `/api/menus/:menuId`                      | protected  | Get single menu by ID           |
| GET    | `/api/menus/deleted`                      | protected  | List soft-deleted menus         |
| PATCH  | `/api/menus/:menuId/status`               | protected  | Update menu status              |
| DELETE | `/api/menus/:menuId`                      | protected  | Soft delete menu                |
| PATCH  | `/api/menus/:menuId/restore`              | protected  | Restore deleted menu            |
| DELETE | `/api/menus/:menuId/hard`                 | superAdmin | Hard delete menu                |

### Menu Items

| Method | Endpoint                                        | Auth      | Description              |
| ------ | ----------------------------------------------- | --------- | ------------------------ |
| POST   | `/api/menus/:menuId/items`                      | protected | Add one or more items    |
| PUT    | `/api/menus/:menuId/items/:itemId`              | protected | Update item              |
| DELETE | `/api/menus/:menuId/items/:itemId`              | protected | Soft delete item         |
| PATCH  | `/api/menus/:menuId/items/:itemId/availability` | protected | Toggle item availability |
| PUT    | `/api/menus/:menuId/reorder`                    | protected | Reorder items            |

### Auditing

| Method | Endpoint                   | Auth      | Description    |
| ------ | -------------------------- | --------- | -------------- |
| GET    | `/api/menus/:menuId/audit` | protected | Get audit logs |

---

## Access Control

### Permission Matrix

| Action             | superAdmin | admin    | storeManager | user |
| ------------------ | ---------- | -------- | ------------ | ---- |
| create (menu)      | ✅         | ✅       | ❌           | ❌   |
| readById           | ✅         | ✅ (own) | ✅ (own)     | ❌   |
| readDeleted        | ✅         | ✅ (own) | ✅ (own)     | ❌   |
| addItem            | ✅         | ✅       | ✅           | ❌   |
| updateItem         | ✅         | ✅       | ✅           | ❌   |
| deleteItem         | ✅         | ✅       | ✅           | ❌   |
| toggleAvailability | ✅         | ✅       | ✅           | ❌   |
| updateStatus       | ✅         | ✅       | ✅           | ❌   |
| reorder            | ✅         | ✅       | ✅           | ❌   |
| restore            | ✅         | ✅       | ✅           | ❌   |
| delete             | ✅         | ✅ (own) | ❌           | ❌   |
| hardDelete         | ✅         | ❌       | ❌           | ❌   |
| readAudit          | ✅         | ✅ (own) | ✅ (own)     | ❌   |

### Role-Based Access

- **superAdmin**: Full access across all restaurants
- **admin**: Access only to their assigned restaurants
- **storeManager**: Access only to their assigned restaurant's menu items (cannot create/delete menus)
- **user (public)**: Read-only access to published menus only

---

## Business Rules

### Menu Creation

1. Only admin/superAdmin can create menus
2. Restaurant must be published
3. Category must be published and active
4. One menu per category per restaurant (unique constraint)
5. If a previously deleted menu exists, it will be restored instead of creating new

### Menu Status Transitions

```
draft ──► published ──► blocked
  ▲                        │
  └────────────────────────┘
```

- **draft**: Initial state, not visible to public
- **published**: Visible to public, requires published restaurant + category + at least one available item
- **blocked**: Cannot be reverted (must stay blocked)

### Public Visibility

- Only `status: 'published'` AND `isActive: true` menus appear in public endpoints
- Only items with `isActive: true` AND `isAvailable: true` are shown publicly
- Items are sorted by `order` field

---

## Data Integrity

### Transactions

All mutations (create, update, delete, status change) use `withTransaction` for ACID compliance:

- Menu creation
- Item add/update/delete
- Status transitions
- Restore operations

### Soft Delete

- **Menu level**: `isActive: false` flag with `deletedAt` and `deletedBy` tracking
- **Item level**: Same pattern embedded in each item
- **Restore**: Re-activates and clears deletion metadata

---

## Auditing

All significant actions are logged:

- CREATE: Menu creation
- UPDATE: Item changes, status changes, restores
- DELETE: Soft deletes (menu and items)
- STATUS_CHANGE: Publish/block actions

Audit logs include:

- `actorId`: User who performed action
- `actorRole`: Role at time of action
- `entityType`: 'menu' or 'menuItem'
- `entityId`: Target ID
- `before`: Previous state (if applicable)
- `after`: New state
- `ipAddress`: Client IP

---

## Validation

### Menu Creation

```javascript
{
  restaurantId: ObjectId(required);
  categoryId: ObjectId(required);
}
```

### Add Items

```javascript
{
  items: [{
    name: string (required)
    description: string (optional)
    image: string (URI, optional)
    price: number (required, >= 0)
    dietary: { vegetarian, vegan } (optional)
    ingredients: [...] (optional)
    nutrition: {...} (optional)
    upsells: [{ label, price }] (optional)
    isMeal: boolean (optional)
    order: number (optional)
    isAvailable: boolean (optional)
  }]
}
```

### Update Status

```javascript
{
  status: 'draft' | 'published' | 'blocked';
}
```

---

## Caching

Public menu endpoint (`GET /api/menus/restaurant/:restaurantId`) uses Redis caching:

- **Cache key**: `menu:restaurant:{id}:{page}:{limit}:{search}:{sort}`
- **TTL**: 300 seconds (5 minutes)
- **Invalidation**: Automatic on cache expiry

---

## Error Handling

| Error Code | Scenario                                                         |
| ---------- | ---------------------------------------------------------------- |
| 400        | Invalid ID format, validation failure, invalid status transition |
| 403        | Unauthorized role, not your restaurant                           |
| 404        | Menu/Item/Category not found                                     |
| 409        | Menu already exists for category, duplicate item name            |
| 500        | Server errors                                                    |

---

## Frontend Integration

### Dashboard Component (`DashMenu.jsx`)

- Restaurant selector (filtered by user role)
- Category selector for menu creation
- Menu list showing all statuses (draft/published)
- Item management modal
- Availability toggle
- Delete/Restore actions

### Permission Gates

- `canCreateMenu`: Show create menu form
- `canAddItem`: Show "Add item" button
- `canToggleAvailability`: Show toggle button
- `canDeleteMenu`: Show delete button

---

## Future Enhancements

1. **Menu item variants**: Size, customization options
2. **Combo meals**: Bundle multiple items
3. **Scheduled availability**: Time-based item availability
4. **Menu templates**: Reusable menu structures
5. **Bulk operations**: Import/export menus
6. **Image optimization**: Automatic image resizing
7. **Menu analytics**: Popular items, revenue tracking

---

## Testing Strategy

### Unit Tests

- Controller logic
- Permission checks
- Validation schemas

### Integration Tests

- End-to-end menu creation flow
- Status transitions
- Soft delete/restore

### Contract Tests

- All endpoints have policy middleware
- Role-scoped access verification
