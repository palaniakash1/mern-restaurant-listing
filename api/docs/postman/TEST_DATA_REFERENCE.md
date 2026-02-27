# API Test Data Reference

> Use this file to quickly copy JSON payloads for testing all 78+ API endpoints

---

## 🔐 AUTH (7 endpoints)

### 1. Signup - User

```json
{
  "userName": "johnuser123",
  "email": "johnuser@example.com",
  "password": "Password123!"
}
```

### 2. Signin - User

```json
{
  "email": "johnuser@example.com",
  "password": "Password123!"
}
```

### 3. Signup - Admin

```json
{
  "userName": "adminrestaurant",
  "email": "admin@restaurant.com",
  "password": "Admin123!",
  "role": "admin"
}
```

### 4. Signin - Admin

```json
{
  "email": "admin@restaurant.com",
  "password": "Admin123!"
}
```

### 5. Change Password

```json
{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword123!"
}
```

---

## 👥 USERS (11 endpoints)

### 1. Create User (Admin)

```json
{
  "userName": "newmanager",
  "email": "manager@example.com",
  "password": "Manager123!",
  "role": "storeManager"
}
```

### 2. Update User

```json
{
  "userName": "updateduser"
}
```

### 3. Assign Restaurant

```json
{
  "restaurantId": "REPLACE_WITH_RESTAURANT_ID"
}
```

### 4. Change Owner

```json
{
  "newOwnerId": "REPLACE_WITH_USER_ID"
}
```

---

## 🍽️ RESTAURANTS (16 endpoints)

### 1. Create Restaurant

```json
{
  "name": "The Golden Fork",
  "tagline": "Best dining experience",
  "description": "A fine dining restaurant serving authentic cuisine",
  "address": {
    "addressLine1": "123 Main Street",
    "addressLine2": "Suite 100",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "zipCode": "10001"
  },
  "contactNumber": "+1-555-123-4567",
  "email": "contact@goldenfork.com",
  "website": "https://goldenfork.com",
  "openingHours": {
    "monday": { "open": "09:00", "close": "22:00" },
    "tuesday": { "open": "09:00", "close": "22:00" },
    "wednesday": { "open": "09:00", "close": "22:00" },
    "thursday": { "open": "09:00", "close": "23:00" },
    "friday": { "open": "09:00", "close": "23:00" },
    "saturday": { "open": "10:00", "close": "23:00" },
    "sunday": { "open": "10:00", "close": "21:00" }
  }
}
```

### 2. Update Restaurant

```json
{
  "name": "The Golden Fork - Updated",
  "tagline": "Now with more flavor!",
  "description": "Updated description",
  "contactNumber": "+1-555-999-9999"
}
```

### 3. Update Restaurant Status

```json
{
  "status": "published"
}
```

### 4. Reassign Admin

```json
{
  "newAdminId": "REPLACE_WITH_ADMIN_USER_ID"
}
```

---

## 📁 CATEGORIES (18 endpoints)

### 1. Create Category (Restaurant-specific)

```json
{
  "name": "Main Course",
  "isGeneric": false,
  "restaurantId": "REPLACE_WITH_RESTAURANT_ID",
  "order": 1
}
```

### 2. Create Generic Category (SuperAdmin)

```json
{
  "name": "Beverages",
  "isGeneric": true,
  "order": 0
}
```

### 3. Update Category

```json
{
  "name": "Appetizers Updated",
  "order": 2
}
```

### 4. Update Category Status

```json
{
  "isActive": false
}
```

### 5. Reorder Categories

```json
[
  { "id": "CATEGORY_ID_1", "order": 1 },
  { "id": "CATEGORY_ID_2", "order": 2 },
  { "id": "CATEGORY_ID_3", "order": 3 }
]
```

### 6. Bulk Reorder Categories

```json
{
  "items": [
    { "id": "CATEGORY_ID_1", "order": 1 },
    { "id": "CATEGORY_ID_2", "order": 2 },
    { "id": "CATEGORY_ID_3", "order": 3 }
  ]
}
```

### 7. Check Category Slug

```json
{
  "name": "Desserts",
  "isGeneric": false,
  "restaurantId": "REPLACE_WITH_RESTAURANT_ID"
}
```

### 8. Bulk Update Status

```json
{
  "ids": ["CATEGORY_ID_1", "CATEGORY_ID_2"],
  "status": "published"
}
```

---

## 🍜 MENUS (14 endpoints)

### 1. Create Menu

```json
{
  "restaurantId": "REPLACE_WITH_RESTAURANT_ID",
  "categoryId": "REPLACE_WITH_CATEGORY_ID"
}
```

### 2. Add Menu Item

```json
{
  "name": "Grilled Salmon",
  "description": "Fresh Atlantic salmon with herbs",
  "price": 24.99,
  "image": "https://example.com/salmon.jpg",
  "isAvailable": true
}
```

### 3. Update Menu Item

```json
{
  "name": "Grilled Salmon - Deluxe",
  "description": "Fresh Atlantic salmon with herbs and lemon butter",
  "price": 27.99
}
```

### 4. Toggle Item Availability

```json
{
  "isAvailable": false
}
```

### 5. Reorder Menu Items

```json
{
  "order": [
    { "itemId": "ITEM_ID_1", "order": 1 },
    { "itemId": "ITEM_ID_2", "order": 2 },
    { "itemId": "ITEM_ID_3", "order": 3 }
  ]
}
```

### 6. Update Menu Status

```json
{
  "status": "published"
}
```

---

## ⭐ REVIEWS (8 endpoints)

### 1. Create Review

```json
{
  "rating": 5,
  "comment": "Amazing food and excellent service! Will definitely come back."
}
```

### 2. Update Review

```json
{
  "rating": 4,
  "comment": "Updated comment - the food was great but service was slow."
}
```

### 3. Moderate Review

```json
{
  "isActive": false
}
```

---

## ⚙️ ADMIN (1 endpoint)

### 1. Create Admin User

```json
{
  "userName": "newadmin",
  "email": "newadmin@restaurant.com",
  "password": "Admin123!",
  "role": "admin"
}
```

---

## 🔍 QUICK START - Testing Order

1. **Start Server**: `npm run dev`
2. **Test Auth** (get token):
   - Signup → Signin → Copy token
3. **Set Token** in Postman: `{{token}}`
4. **Create Restaurant** (as admin)
5. **Create Category**
6. **Create Menu** + **Add Items**
7. **Create Review** (as user)
8. **Test Public Endpoints** (no auth needed)

---

## 📝 PLACEHOLDERS

| Placeholder                  | Description         | How to get                       |
| ---------------------------- | ------------------- | -------------------------------- |
| `{{token}}`                  | JWT token           | From signin response             |
| `REPLACE_WITH_RESTAURANT_ID` | Restaurant ObjectId | From create restaurant response  |
| `REPLACE_WITH_CATEGORY_ID`   | Category ObjectId   | From create category response    |
| `REPLACE_WITH_ADMIN_USER_ID` | Admin user ObjectId | From list users response         |
| `:id`                        | Any ObjectId        | From respective create responses |

---

## 🔗 Postman Collection

Import this file in Postman:

```
api/docs/postman/complete-api-test-data.json
```

Or copy the JSON from the file above and import as raw JSON.
