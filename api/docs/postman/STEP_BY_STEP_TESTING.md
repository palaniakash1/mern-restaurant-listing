# 🚀 Step-by-Step API Testing Guide

> Complete testing sequence with real demo data to populate your database

---

## Prerequisites

1. Start your server: `npm run dev`
2. Server URL: `http://localhost:3000`
3. Base URL: `http://localhost:3000/api`

---

## 📋 STEP 1: Create SuperAdmin (First User!)

> Every system needs a superAdmin to manage everything

### Request 1.1: Signup as SuperAdmin

```
POST {{baseUrl}}/auth/signup
Content-Type: application/json

{
  "userName": "superadmin",
  "email": "superadmin@example.com",
  "password": "SuperAdmin123!",
  "role": "superAdmin"
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "_id": "MONGODB_ID_1",
    "userName": "superadmin",
    "email": "superadmin@example.com",
    "role": "superAdmin",
    "isActive": true
  }
}
```

**Save:** `SUPERADMIN_ID = MONGODB_ID_1` (from response)
**Save:** `SUPERADMIN_TOKEN` (from Authorization header)

---

## 📋 STEP 2: Create a Regular User

> This user will write reviews

### Request 2.1: Signup as Regular User

```
POST {{baseUrl}}/auth/signup
Content-Type: application/json

{
  "userName": "johndoe",
  "email": "johndoe@example.com",
  "password": "User123!"
}
```

**Save:** `USER_ID = MONGODB_ID_2` (from response)
**Save:** `USER_TOKEN` (from Authorization header)

---

## 📋 STEP 3: Create Restaurant Admin

> This admin will own/manage a restaurant

### Request 3.1: Signup as Admin

```
POST {{baseUrl}}/auth/signup
Content-Type: application/json

{
  "userName": "pizzaadmin",
  "email": "admin@pizzapalace.com",
  "password": "Admin123!",
  "role": "admin"
}
```

**Save:** `ADMIN_ID = MONGODB_ID_3` (from response)
**Save:** `ADMIN_TOKEN` (from Authorization header)

---

## 📋 STEP 4: Create Restaurant

> Now let's create the restaurant using admin account

### Request 4.1: Create Restaurant (As Admin)

```
POST {{baseUrl}}/restaurants
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "name": "Pizza Palace",
  "tagline": "Best Pizza in Town",
  "description": "Authentic Italian pizza made with fresh ingredients",
  "address": {
    "addressLine1": "456 Food Street",
    "addressLine2": "Downtown",
    "city": "Los Angeles",
    "state": "CA",
    "country": "USA",
    "zipCode": "90001"
  },
  "contactNumber": "+1-555-PIZZA-01",
  "email": "info@pizzapalace.com",
  "website": "https://pizzapalace.com",
  "openingHours": {
    "monday": { "open": "11:00", "close": "22:00" },
    "tuesday": { "open": "11:00", "close": "22:00" },
    "wednesday": { "open": "11:00", "close": "22:00" },
    "thursday": { "open": "11:00", "close": "23:00" },
    "friday": { "open": "11:00", "close": "23:00" },
    "saturday": { "open": "12:00", "close": "23:00" },
    "sunday": { "open": "12:00", "close": "21:00" }
  }
}
```

**Expected:** Status: 201 Created
**Save:** `RESTAURANT_ID = MONGODB_ID_4`
**Save:** `RESTAURANT_SLUG = pizza-palace` (from response)

---

## 📋 STEP 5: Publish Restaurant

> Admin needs to publish the restaurant before it's visible

### Request 5.1: Update Restaurant Status to Published

```
PATCH {{baseUrl}}/restaurants/id/{{RESTAURANT_ID}}/status
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "status": "published"
}
```

---

## 📋 STEP 6: Create Categories

> Create menu categories for the restaurant

### Request 6.1: Create Category - Appetizers

```
POST {{baseUrl}}/categories
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "name": "Appetizers",
  "isGeneric": false,
  "restaurantId": "{{RESTAURANT_ID}}",
  "order": 1
}
```

**Save:** `CATEGORY_ID_1 = MONGODB_ID_5`

### Request 6.2: Create Category - Main Course

```
POST {{baseUrl}}/categories
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "name": "Main Course",
  "isGeneric": false,
  "restaurantId": "{{RESTAURANT_ID}}",
  "order": 2
}
```

**Save:** `CATEGORY_ID_2 = MONGODB_ID_6`

### Request 6.3: Create Category - Beverages

```
POST {{baseUrl}}/categories
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "name": "Beverages",
  "isGeneric": false,
  "restaurantId": "{{RESTAURANT_ID}}",
  "order": 3
}
```

**Save:** `CATEGORY_ID_3 = MONGODB_ID_7`

### Request 6.4: Create Category - Desserts

```
POST {{baseUrl}}/categories
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "name": "Desserts",
  "isGeneric": false,
  "restaurantId": "{{RESTAURANT_ID}}",
  "order": 4
}
```

**Save:** `CATEGORY_ID_4 = MONGODB_ID_8`

---

## 📋 STEP 7: Create Menus

> Create a menu for each category

### Request 7.1: Create Menu for Appetizers

```
POST {{baseUrl}}/menus
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "restaurantId": "{{RESTAURANT_ID}}",
  "categoryId": "{{CATEGORY_ID_1}}"
}
```

**Save:** `MENU_ID_1 = MONGODB_ID_9`

### Request 7.2: Create Menu for Main Course

```
POST {{baseUrl}}/menus
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "restaurantId": "{{RESTAURANT_ID}}",
  "categoryId": "{{CATEGORY_ID_2}}"
}
```

**Save:** `MENU_ID_2 = MONGODB_ID_10`

### Request 7.3: Create Menu for Beverages

```
POST {{baseUrl}}/menus
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "restaurantId": "{{RESTAURANT_ID}}",
  "categoryId": "{{CATEGORY_ID_3}}"
}
```

**Save:** `MENU_ID_3 = MONGODB_ID_11`

### Request 7.4: Create Menu for Desserts

```
POST {{baseUrl}}/menus
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "restaurantId": "{{RESTAURANT_ID}}",
  "categoryId": "{{CATEGORY_ID_4}}"
}
```

**Save:** `MENU_ID_4 = MONGODB_ID_12`

---

## 📋 STEP 8: Add Menu Items

> Add delicious food items to each menu

### Request 8.1: Add Appetizer Items

```
POST {{baseUrl}}/menus/{{MENU_ID_1}}/items
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "name": "Garlic Bread",
  "description": "Crispy bread with garlic butter and herbs",
  "price": 8.99,
  "image": "https://example.com/garlic-bread.jpg",
  "isAvailable": true
}
```

**Save:** `ITEM_ID_1`

```
POST {{baseUrl}}/menus/{{MENU_ID_1}}/items
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "name": "Bruschetta",
  "description": "Toasted bread topped with fresh tomatoes and basil",
  "price": 10.99,
  "image": "https://example.com/bruschetta.jpg",
  "isAvailable": true
}
```

**Save:** `ITEM_ID_2`

### Request 8.2: Add Main Course Items

```
POST {{baseUrl}}/menus/{{MENU_ID_2}}/items
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "name": "Margherita Pizza",
  "description": "Classic pizza with tomato sauce, mozzarella, and fresh basil",
  "price": 16.99,
  "image": "https://example.com/margherita.jpg",
  "isAvailable": true
}
```

**Save:** `ITEM_ID_3`

```
POST {{baseUrl}}/menus/{{MENU_ID_2}}/items
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "name": "Pepperoni Pizza",
  "description": "Loaded with pepperoni and melted cheese",
  "price": 18.99,
  "image": "https://example.com/pepperoni.jpg",
  "isAvailable": true
}
```

**Save:** `ITEM_ID_4`

```
POST {{baseUrl}}/menus/{{MENU_ID_2}}/items
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "name": "BBQ Chicken Pizza",
  "description": "Grilled chicken, BBQ sauce, red onions, cilantro",
  "price": 19.99,
  "image": "https://example.com/bbq-chicken.jpg",
  "isAvailable": true
}
```

**Save:** `ITEM_ID_5`

```
POST {{baseUrl}}/menus/{{MENU_ID_2}}/items
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "name": "Pasta Carbonara",
  "description": "Creamy pasta with bacon, egg, and parmesan",
  "price": 17.99,
  "image": "https://example.com/carbonara.jpg",
  "isAvailable": true
}
```

**Save:** `ITEM_ID_6`

### Request 8.3: Add Beverage Items

```
POST {{baseUrl}}/menus/{{MENU_ID_3}}/items
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "name": "Coca Cola",
  "description": "Refreshing soft drink",
  "price": 2.99,
  "isAvailable": true
}
```

```
POST {{baseUrl}}/menus/{{MENU_ID_3}}/items
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "name": "Fresh Lemonade",
  "description": "Homemade lemonade with fresh lemons",
  "price": 4.99,
  "isAvailable": true
}
```

```
POST {{baseUrl}}/menus/{{MENU_ID_3}}/items
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "name": "Iced Coffee",
  "description": "Cold brew coffee with ice",
  "price": 5.99,
  "isAvailable": true
}
```

### Request 8.4: Add Dessert Items

```
POST {{baseUrl}}/menus/{{MENU_ID_4}}/items
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "name": "Tiramisu",
  "description": "Classic Italian dessert with coffee and mascarpone",
  "price": 8.99,
  "image": "https://example.com/tiramisu.jpg",
  "isAvailable": true
}
```

```
POST {{baseUrl}}/menus/{{MENU_ID_4}}/items
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "name": "Chocolate Lava Cake",
  "description": "Warm chocolate cake with molten center",
  "price": 9.99,
  "image": "https://example.com/lava-cake.jpg",
  "isAvailable": true
}
```

---

## 📋 STEP 9: Publish Menus

> Make menus visible to customers

### Request 9.1: Publish All Menus

```
PATCH {{baseUrl}}/menus/{{MENU_ID_1}}/status
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "status": "published"
}
```

```
PATCH {{baseUrl}}/menus/{{MENU_ID_2}}/status
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "status": "published"
}
```

```
PATCH {{baseUrl}}/menus/{{MENU_ID_3}}/status
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "status": "published"
}
```

```
PATCH {{baseUrl}}/menus/{{MENU_ID_4}}/status
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json

{
  "status": "published"
}
```

---

## 📋 STEP 10: Create Reviews

> Regular users can now review the restaurant

### Request 10.1: Create Review (As Regular User)

```
POST {{baseUrl}}/reviews/restaurant/{{RESTAURANT_ID}}
Authorization: Bearer {{USER_TOKEN}}
Content-Type: application/json

{
  "rating": 5,
  "comment": "Absolutely amazing pizza! The best I've ever had. Will definitely come back!"
}
```

### Request 10.2: Create Another Review (As Regular User)

```
POST {{baseUrl}}/reviews/restaurant/{{RESTAURANT_ID}}
Authorization: Bearer {{USER_TOKEN}}
Content-Type: application/json

{
  "rating": 4,
  "comment": "Great food and service. The garlic bread was delicious!"
}
```

---

## 📋 STEP 11: Test Public Endpoints

> These don't require authentication

### Request 11.1: List All Restaurants

```
GET {{baseUrl}}/restaurants
```

### Request 11.2: Get Featured Restaurants

```
GET {{baseUrl}}/restaurants/featured
```

### Request 11.3: Get Restaurant by Slug

```
GET {{baseUrl}}/restaurants/slug/pizza-palace
```

### Request 11.4: Get Restaurant Details (with menu)

```
GET {{baseUrl}}/restaurants/pizza-palace/details
```

### Request 11.5: Get Menu by Restaurant

```
GET {{baseUrl}}/menus/restaurant/{{RESTAURANT_ID}}
```

### Request 11.6: Get Categories

```
GET {{baseUrl}}/categories?restaurantId={{RESTAURANT_ID}}
```

### Request 11.7: Get Restaurant Reviews

```
GET {{baseUrl}}/reviews/restaurant/{{RESTAURANT_ID}}
```

### Request 11.8: Get Review Summary

```
GET {{baseUrl}}/reviews/restaurant/{{RESTAURANT_ID}}/summary
```

---

## 📋 STEP 12: Admin Management

### Request 12.1: Get My Restaurant (Admin)

```
GET {{baseUrl}}/restaurants/me
Authorization: Bearer {{ADMIN_TOKEN}}
```

### Request 12.2: Get Admin Restaurant Summary

```
GET {{baseUrl}}/restaurants/me/summary
Authorization: Bearer {{ADMIN_TOKEN}}
```

### Request 12.3: Get My Categories (Admin)

```
GET {{baseUrl}}/categories/my
Authorization: Bearer {{ADMIN_TOKEN}}
```

---

## 📋 STEP 13: SuperAdmin Operations

### Request 13.1: List All Users

```
GET {{baseUrl}}/users
Authorization: Bearer {{SUPERADMIN_TOKEN}}
```

### Request 13.2: List All Admins

```
GET {{baseUrl}}/users/admins
Authorization: Bearer {{SUPERADMIN_TOKEN}}
```

### Request 13.3: Get All Categories (Including Inactive)

```
GET {{baseUrl}}/categories/all
Authorization: Bearer {{SUPERADMIN_TOKEN}}
```

### Request 13.4: Get Audit Logs

```
GET {{baseUrl}}/auditlogs?page=1&limit=20
Authorization: Bearer {{SUPERADMIN_TOKEN}}
```

---

## 📋 STEP 14: Mark Restaurant as Featured

> SuperAdmin can feature a restaurant

### Request 14.1: Update Restaurant (Add isFeatured)

```
PATCH {{baseUrl}}/restaurants/id/{{RESTAURANT_ID}}
Authorization: Bearer {{SUPERADMIN_TOKEN}}
Content-Type: application/json

{
  "isFeatured": true,
  "isTrending": true
}
```

---

## ✅ Complete! Your Database Now Has:

| Entity            | Count |
| ----------------- | ----- |
| SuperAdmin        | 1     |
| Regular Users     | 1     |
| Restaurant Admins | 1     |
| Restaurants       | 1     |
| Categories        | 4     |
| Menus             | 4     |
| Menu Items        | 12+   |
| Reviews           | 2     |

---

## 🔗 Quick Reference - All Endpoints Used

### Auth

- `POST /api/auth/signup` - Create user
- `POST /api/auth/signin` - Login

### Restaurants

- `POST /api/restaurants` - Create
- `GET /api/restaurants` - List
- `GET /api/restaurants/slug/:slug` - By slug
- `GET /api/restaurants/:slug/details` - With menu
- `PATCH /api/restaurants/id/:id/status` - Publish
- `PATCH /api/restaurants/id/:id` - Update
- `GET /api/restaurants/me` - My restaurant
- `GET /api/restaurants/me/summary` - Summary

### Categories

- `POST /api/categories` - Create
- `GET /api/categories` - List
- `GET /api/categories/my` - Admin's categories

### Menus

- `POST /api/menus` - Create
- `POST /api/menus/:id/items` - Add item
- `PATCH /api/menus/:id/status` - Publish
- `GET /api/menus/restaurant/:id` - Public menu

### Reviews

- `POST /api/reviews/restaurant/:id` - Create
- `GET /api/reviews/restaurant/:id` - List
- `GET /api/reviews/restaurant/:id/summary` - Summary

### Users

- `GET /api/users` - List all
- `GET /api/users/admins` - List admins

### System

- `GET /api/health` - Health check
- `GET /api/live` - Liveness
