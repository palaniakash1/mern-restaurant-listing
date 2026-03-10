# API Testing Checklist

> Complete testing checklist for all 86+ API endpoints with role-based access control

---

## 📋 Legend

- [ ] = Not Tested
- [x] = Tested & Passed
- [~] = Tested with Issues

| Symbol | Role             |
| ------ | ---------------- |
| 👤     | User             |
| 👔     | StoreManager     |
| 🏪     | Admin            |
| ⚡     | SuperAdmin       |
| 🌐     | Public (No Auth) |

---

# AUTHENTICATION (15 Endpoints)

## User Registration And Session Governance

| #   | Endpoint                                        | Method | Role       | Test Case                           | Status |
| --- | ----------------------------------------------- | ------ | ---------- | ----------------------------------- | ------ |
| 1   | `/api/auth/signup`                              | POST   | User       | Create regular user                 | [ ]    |
| 2   | `/api/auth/signin`                              | POST   | User       | Login with valid credentials        | [ ]    |
| 3   | `/api/auth/signup`                              | POST   | Admin      | Create admin user                   | [ ]    |
| 4   | `/api/auth/signin`                              | POST   | Admin      | Admin login                         | [ ]    |
| 5   | `/api/auth/google`                              | POST   | User       | OAuth Google signup                 | [ ]    |
| 6   | `/api/auth/session`                             | GET    | User       | Get current session                 | [ ]    |
| 7   | `/api/auth/change-password`                     | POST   | User       | Change password                     | [ ]    |
| 8   | `/api/auth/refresh`                             | POST   | User       | Rotate refresh/access token         | [ ]    |
| 9   | `/api/auth/sessions`                            | GET    | User       | List current user sessions          | [ ]    |
| 10  | `/api/auth/sessions/:id`                        | DELETE | User       | Revoke one user session             | [ ]    |
| 11  | `/api/auth/signout-all`                         | POST   | User       | Revoke all other user sessions      | [ ]    |
| 12  | `/api/auth/signout`                             | POST   | User       | Sign out current session            | [ ]    |
| 13  | `/api/auth/admin/users/:id/sessions`            | GET    | SuperAdmin | SuperAdmin list user sessions       | [ ]    |
| 14  | `/api/auth/admin/users/:id/sessions/:sessionId` | DELETE | SuperAdmin | SuperAdmin revoke one user session  | [ ]    |
| 15  | `/api/auth/admin/users/:id/sessions/revoke-all` | POST   | SuperAdmin | SuperAdmin revoke all user sessions | [ ]    |

## Auth Error Tests

| #   | Test Case                      | Expected Error                           | Status |
| --- | ------------------------------ | ---------------------------------------- | ------ |
| 1   | Signup with invalid email      | "Please enter a valid email address"     | [ ]    |
| 2   | Signup with weak password      | "Password must be at least 8 characters" | [ ]    |
| 3   | Signup with existing email     | "Email already exists"                   | [ ]    |
| 4   | Signin with wrong password     | "Invalid credentials"                    | [ ]    |
| 5   | Signin with non-existent email | "User not found"                         | [ ]    |

---

# 👥 USERS (11 Endpoints)

## 👔🏪 User Management

| #   | Endpoint                    | Method | Role | Test Case            | Status |
| --- | --------------------------- | ------ | ---- | -------------------- | ------ |
| 1   | `/api/users`                | GET    | ⚡   | List all users       | [ ]    |
| 2   | `/api/users/admins`         | GET    | ⚡   | List all admins      | [ ]    |
| 3   | `/api/users/store-managers` | GET    | 🏪   | List store managers  | [ ]    |
| 4   | `/api/users`                | POST   | 🏪   | Create store manager | [ ]    |
| 5   | `/api/users/:id`            | GET    | ⚡🏪 | Get user by ID       | [ ]    |
| 6   | `/api/users/:id`            | PATCH  | ⚡🏪 | Update user          | [ ]    |
| 7   | `/api/users/:id/deactivate` | PATCH  | ⚡🏪 | Deactivate user      | [ ]    |
| 8   | `/api/users/:id/restore`    | PATCH  | ⚡   | Restore user         | [ ]    |
| 9   | `/api/users/:id/restaurant` | PATCH  | ⚡🏪 | Assign restaurant    | [ ]    |
| 10  | `/api/users/:id/restaurant` | DELETE | ⚡🏪 | Unassign restaurant  | [ ]    |
| 11  | `/api/users/:id/owner`      | PATCH  | ⚡   | Change owner         | [ ]    |

## User Error Tests

| #   | Test Case                     | Expected Error      | Status |
| --- | ----------------------------- | ------------------- | ------ |
| 1   | List users without auth       | "Unauthorized"      | [ ]    |
| 2   | Create user as regular user   | "Permission denied" | [ ]    |
| 3   | Update another user's profile | "Permission denied" | [ ]    |
| 4   | Deactivate superAdmin         | "Permission denied" | [ ]    |
| 5   | Restore non-deleted user      | "User not found"    | [ ]    |

---

# 🍽️ RESTAURANTS (16 Endpoints)

## 🌐 Public Endpoints

| #   | Endpoint                         | Method | Role | Test Case                | Status |
| --- | -------------------------------- | ------ | ---- | ------------------------ | ------ |
| 1   | `/api/restaurants`               | GET    | 🌐   | List all restaurants     | [ ]    |
| 2   | `/api/restaurants/featured`      | GET    | 🌐   | Get featured restaurants | [ ]    |
| 3   | `/api/restaurants/trending`      | GET    | 🌐   | Get trending restaurants | [ ]    |
| 4   | `/api/restaurants/nearby`        | GET    | 🌐   | Get nearby restaurants   | [ ]    |
| 5   | `/api/restaurants/slug/:slug`    | GET    | 🌐   | Get by slug              | [ ]    |
| 6   | `/api/restaurants/:slug/details` | GET    | 🌐   | Get full details         | [ ]    |

## 🏪 Admin Endpoints

| #   | Endpoint                         | Method | Role | Test Case                         | Status |
| --- | -------------------------------- | ------ | ---- | --------------------------------- | ------ |
| 7   | `/api/restaurants`               | POST   | 🏪   | Create restaurant (full details)  | [ ]    |
| 8   | `/api/restaurants`               | POST   | 🏪   | Create restaurant (required only) | [ ]    |
| 9   | `/api/restaurants/me`            | GET    | 🏪   | Get my restaurant                 | [ ]    |
| 10  | `/api/restaurants/me/summary`    | GET    | 🏪   | Get admin summary                 | [ ]    |
| 11  | `/api/restaurants/id/:id`        | PATCH  | 🏪   | Update restaurant                 | [ ]    |
| 12  | `/api/restaurants/id/:id/status` | PATCH  | 🏪   | Publish restaurant                | [ ]    |
| 13  | `/api/restaurants/id/:id`        | DELETE | 🏪   | Delete restaurant                 | [ ]    |

## ⚡ SuperAdmin Endpoints

| #   | Endpoint                          | Method | Role | Test Case            | Status |
| --- | --------------------------------- | ------ | ---- | -------------------- | ------ |
| 14  | `/api/restaurants/all`            | GET    | ⚡   | List all restaurants | [ ]    |
| 15  | `/api/restaurants/id/:id/status`  | PATCH  | ⚡   | Change status        | [ ]    |
| 16  | `/api/restaurants/id/:id/restore` | PATCH  | ⚡   | Restore restaurant   | [ ]    |
| 17  | `/api/restaurants/id/:id/admin`   | PATCH  | ⚡   | Reassign admin       | [ ]    |

---

## Restaurant Test Cases

### Create Restaurant Variations

| #   | Test Case                 | Required Fields                     | Status |
| --- | ------------------------- | ----------------------------------- | ------ |
| 1   | Create with all details   | name, address, contactNumber, email | [ ]    |
| 2   | Create with only required | name, address                       | [ ]    |
| 3   | Create with opening hours | All fields                          | [ ]    |
| 4   | Create with geolocation   | lat, lng                            | [ ]    |
| 5   | Create with images        | gallery array                       | [ ]    |
| 6   | Create with categories    | categories array                    | [ ]    |
| 7   | Create without name       | Validation error                    | [ ]    |
| 8   | Create without address    | Validation error                    | [ ]    |
| 9   | Create duplicate name     | Handle duplicate                    | [ ]    |

### Restaurant Error Tests

| #   | Test Case                         | Expected Error           | Status |
| --- | --------------------------------- | ------------------------ | ------ |
| 1   | Create restaurant as user         | "Permission denied"      | [ ]    |
| 2   | Update another admin's restaurant | "Not your restaurant"    | [ ]    |
| 3   | Delete published restaurant       | Should allow             | [ ]    |
| 4   | Publish without items             | "Must have active items" | [ ]    |

---

# 📁 CATEGORIES (18 Endpoints)

## 🌐 Public Endpoints

| #   | Endpoint                           | Method | Role | Test Case          | Status |
| --- | ---------------------------------- | ------ | ---- | ------------------ | ------ |
| 1   | `/api/categories`                  | GET    | 🌐   | List categories    | [ ]    |
| 2   | `/api/categories?restaurantId=:id` | GET    | 🌐   | List by restaurant | [ ]    |

## 🏪 Admin Endpoints

| #   | Endpoint                       | Method | Role | Test Case               | Status |
| --- | ------------------------------ | ------ | ---- | ----------------------- | ------ |
| 3   | `/api/categories`              | POST   | 🏪   | Create category         | [ ]    |
| 4   | `/api/categories/my`           | GET    | 🏪   | My categories           | [ ]    |
| 5   | `/api/categories/:id`          | GET    | 🏪   | Get by ID               | [ ]    |
| 6   | `/api/categories/:id`          | PATCH  | 🏪   | Update category         | [ ]    |
| 7   | `/api/categories/:id`          | DELETE | 🏪   | Delete category         | [ ]    |
| 8   | `/api/categories/:id/status`   | PATCH  | 🏪   | Toggle status           | [ ]    |
| 9   | `/api/categories/reorder`      | PATCH  | 🏪   | Reorder categories      | [ ]    |
| 10  | `/api/categories/bulk-reorder` | POST   | 🏪   | Bulk reorder            | [ ]    |
| 11  | `/api/categories/check-slug`   | POST   | 🏪   | Check slug availability | [ ]    |

## ⚡ SuperAdmin Endpoints

| #   | Endpoint                      | Method | Role | Test Case               | Status |
| --- | ----------------------------- | ------ | ---- | ----------------------- | ------ |
| 12  | `/api/categories`             | POST   | ⚡   | Create generic category | [ ]    |
| 13  | `/api/categories/all`         | GET    | ⚡   | Get all categories      | [ ]    |
| 14  | `/api/categories/deleted`     | GET    | ⚡   | Get deleted categories  | [ ]    |
| 15  | `/api/categories/:id/restore` | PATCH  | ⚡   | Restore category        | [ ]    |
| 16  | `/api/categories/bulk-status` | PATCH  | ⚡   | Bulk update status      | [ ]    |
| 17  | `/api/categories/export`      | GET    | ⚡   | Export categories       | [ ]    |
| 18  | `/api/categories/:id/audit`   | GET    | ⚡🏪 | Get audit logs          | [ ]    |
| 19  | `/api/categories/:id/hard`    | DELETE | ⚡   | Hard delete             | [ ]    |

---

## Category Test Cases

### Create Category Variations

| #   | Test Case                | Payload                               | Status |
| --- | ------------------------ | ------------------------------------- | ------ |
| 1   | Create specific category | isGeneric: false, restaurantId: "..." | [ ]    |
| 2   | Create generic category  | isGeneric: true                       | [ ]    |
| 3   | Create with order        | order: 1                              | [ ]    |
| 4   | Create duplicate name    | Handle duplicate                      | [ ]    |

### Category Error Tests

| #   | Test Case                        | Expected Error                                 | Status |
| --- | -------------------------------- | ---------------------------------------------- | ------ |
| 1   | Create generic as admin          | "Only superAdmin can create generic"           | [ ]    |
| 2   | Create without name              | "Category name is required"                    | [ ]    |
| 3   | Delete category with active menu | "Cannot delete category linked to active menu" | [ ]    |
| 4   | Update another admin's category  | "Not your restaurant"                          | [ ]    |

---

# 🍜 MENUS (14 Endpoints)

## 🌐 Public Endpoints

| #   | Endpoint                    | Method | Role | Test Case           | Status |
| --- | --------------------------- | ------ | ---- | ------------------- | ------ |
| 1   | `/api/menus/restaurant/:id` | GET    | 🌐   | Get restaurant menu | [ ]    |

## 🏪👔 Admin/Manager Endpoints

| #   | Endpoint                                        | Method | Role | Test Case           | Status |
| --- | ----------------------------------------------- | ------ | ---- | ------------------- | ------ |
| 2   | `/api/menus`                                    | POST   | 🏪   | Create menu         | [ ]    |
| 3   | `/api/menus/:id`                                | GET    | 🏪👔 | Get menu by ID      | [ ]    |
| 4   | `/api/menus/:id/items`                          | POST   | 🏪👔 | Add menu item       | [ ]    |
| 5   | `/api/menus/:menuId/items/:itemId`              | PATCH  | 🏪👔 | Update item         | [ ]    |
| 6   | `/api/menus/:menuId/items/:itemId`              | DELETE | 🏪👔 | Delete item         | [ ]    |
| 7   | `/api/menus/:menuId/items/:itemId/availability` | PATCH  | 🏪👔 | Toggle availability | [ ]    |
| 8   | `/api/menus/:id/reorder`                        | PATCH  | 🏪👔 | Reorder items       | [ ]    |
| 9   | `/api/menus/:id/status`                         | PATCH  | 🏪👔 | Update status       | [ ]    |
| 10  | `/api/menus/:id`                                | DELETE | 🏪   | Soft delete menu    | [ ]    |
| 11  | `/api/menus/:id/restore`                        | PATCH  | 🏪   | Restore menu        | [ ]    |
| 12  | `/api/menus/deleted`                            | GET    | 🏪   | Get deleted menus   | [ ]    |
| 13  | `/api/menus/:id/audit`                          | GET    | 🏪👔 | Get audit logs      | [ ]    |
| 14  | `/api/menus/:id/hard`                           | DELETE | ⚡   | Hard delete         | [ ]    |

---

## Menu Test Cases

### Create Menu Variations

| #   | Test Case                | Payload                             | Status |
| --- | ------------------------ | ----------------------------------- | ------ |
| 1   | Create menu for category | restaurantId, categoryId            | [ ]    |
| 2   | Create duplicate menu    | Should fail - "Menu already exists" | [ ]    |

### Add Menu Item Variations

| #   | Test Case                    | Payload                         | Status |
| --- | ---------------------------- | ------------------------------- | ------ |
| 1   | Add item with all details    | name, description, price, image | [ ]    |
| 2   | Add item with required only  | name, price                     | [ ]    |
| 3   | Add item with dietary        | vegetarian, vegan flags         | [ ]    |
| 4   | Add item with allergens      | array of allergens              | [ ]    |
| 5   | Add item with nutrition      | nutrition object                | [ ]    |
| 6   | Add item with upsells        | upsells array                   | [ ]    |
| 7   | Add item with isMeal         | isMeal: true                    | [ ]    |
| 8   | Add duplicate item name      | Should fail                     | [ ]    |
| 9   | Add item with negative price | Should fail                     | [ ]    |

### Menu Item Error Tests

| #   | Test Case                         | Expected Error             | Status |
| --- | --------------------------------- | -------------------------- | ------ |
| 1   | Add item as regular user          | "Permission denied"        | [ ]    |
| 2   | Update item in another restaurant | "Not allowed"              | [ ]    |
| 3   | Delete item with invalid ID       | "Item not found"           | [ ]    |
| 4   | Publish menu without items        | "Must have active items"   | [ ]    |
| 5   | Reorder with invalid order        | "Order must be sequential" | [ ]    |

---

# ⭐ REVIEWS (8 Endpoints)

## 🌐 Public Endpoints

| #   | Endpoint                              | Method | Role | Test Case          | Status |
| --- | ------------------------------------- | ------ | ---- | ------------------ | ------ |
| 1   | `/api/reviews/restaurant/:id`         | GET    | 🌐   | List reviews       | [ ]    |
| 2   | `/api/reviews/restaurant/:id/summary` | GET    | 🌐   | Get rating summary | [ ]    |

## 👤 User Endpoints

| #   | Endpoint                      | Method | Role | Test Case         | Status |
| --- | ----------------------------- | ------ | ---- | ----------------- | ------ |
| 3   | `/api/reviews/restaurant/:id` | POST   | 👤   | Create review     | [ ]    |
| 4   | `/api/reviews/my`             | GET    | 👤   | Get my reviews    | [ ]    |
| 5   | `/api/reviews/:id`            | PATCH  | 👤   | Update own review | [ ]    |
| 6   | `/api/reviews/:id`            | DELETE | 👤   | Delete own review | [ ]    |

## 🏪 Admin Endpoints

| #   | Endpoint                    | Method | Role | Test Case        | Status |
| --- | --------------------------- | ------ | ---- | ---------------- | ------ |
| 7   | `/api/reviews/:id`          | GET    | 🏪   | Get review by ID | [ ]    |
| 8   | `/api/reviews/:id/moderate` | PATCH  | 🏪   | Moderate review  | [ ]    |

---

## Review Test Cases

### Create Review Variations

| #   | Test Case                          | Payload                   | Status |
| --- | ---------------------------------- | ------------------------- | ------ |
| 1   | Create with rating only            | rating: 5                 | [ ]    |
| 2   | Create with rating + comment       | rating: 4, comment: "..." | [ ]    |
| 3   | Create with rating 1               | rating: 1                 | [ ]    |
| 4   | Create with rating 5               | rating: 5                 | [ ]    |
| 5   | Create for non-existent restaurant | Should fail               | [ ]    |

### Review Error Tests

| #   | Test Case                    | Expected Error                   | Status |
| --- | ---------------------------- | -------------------------------- | ------ |
| 1   | Create review as admin       | "Only public users can submit"   | [ ]    |
| 2   | Create duplicate review      | "You already reviewed"           | [ ]    |
| 3   | Create review with rating 0  | "rating must be between 1 and 5" | [ ]    |
| 4   | Create review with rating 6  | "rating must be between 1 and 5" | [ ]    |
| 5   | Update another user's review | "Not allowed"                    | [ ]    |
| 6   | Moderate without permission  | "Permission denied"              | [ ]    |

---

# ⚙️ ADMIN (1 Endpoint)

| #   | Endpoint           | Method | Role | Test Case              | Status |
| --- | ------------------ | ------ | ---- | ---------------------- | ------ |
| 1   | `/api/admin/users` | POST   | ⚡   | Create privileged user | [ ]    |

### Admin Error Tests

| #   | Test Case                    | Expected Error      | Status |
| --- | ---------------------------- | ------------------- | ------ |
| 1   | Create admin as regular user | "Permission denied" | [ ]    |
| 2   | Create with invalid role     | "Invalid role"      | [ ]    |

---

# 🔍 AUDIT LOGS (1 Endpoint)

| #   | Endpoint         | Method | Role | Test Case      | Status |
| --- | ---------------- | ------ | ---- | -------------- | ------ |
| 1   | `/api/auditlogs` | GET    | ⚡🏪 | Get audit logs | [ ]    |

### Audit Log Tests

| #   | Test Case            | Filter                   | Status |
| --- | -------------------- | ------------------------ | ------ |
| 1   | Get all logs         | No filter                | [ ]    |
| 2   | Filter by entityType | entityType: "restaurant" | [ ]    |
| 3   | Filter by action     | action: "CREATE"         | [ ]    |
| 4   | Filter by actorId    | actorId: "..."           | [ ]    |
| 5   | Filter by date range | from, to                 | [ ]    |
| 6   | Pagination           | page, limit              | [ ]    |

---

# 🏥 SYSTEM (3 Endpoints)

| #   | Endpoint      | Method | Role | Test Case       | Status |
| --- | ------------- | ------ | ---- | --------------- | ------ |
| 1   | `/api/health` | GET    | 🌐   | Health check    | [ ]    |
| 2   | `/api/live`   | GET    | 🌐   | Liveness probe  | [ ]    |
| 3   | `/api/ready`  | GET    | 🌐   | Readiness probe | [ ]    |

---

# 📊 TEST SUMMARY

## By Role

| Role            | Endpoints | Tested | Remaining |
| --------------- | --------- | ------ | --------- |
| 🌐 Public       | 10        | [ ]    | [ ]       |
| 👤 User         | 10        | [ ]    | [ ]       |
| 👔 StoreManager | 10        | [ ]    | [ ]       |
| 🏪 Admin        | 25        | [ ]    | [ ]       |
| ⚡ SuperAdmin   | 20        | [ ]    | [ ]       |

## By Module

| Module      | Total  | Tested | Remaining |
| ----------- | ------ | ------ | --------- |
| Auth        | 15     | [ ]    | [ ]       |
| Users       | 11     | [ ]    | [ ]       |
| Restaurants | 16     | [ ]    | [ ]       |
| Categories  | 18     | [ ]    | [ ]       |
| Menus       | 14     | [ ]    | [ ]       |
| Reviews     | 8      | [ ]    | [ ]       |
| Admin       | 1      | [ ]    | [ ]       |
| Audit       | 1      | [ ]    | [ ]       |
| System      | 3      | [ ]    | [ ]       |
| **TOTAL**   | **86** | [ ]    | [ ]       |

---

# 🧪 ERROR RESPONSE TESTING CHECKLIST

## Validation Errors

| #   | Field    | Invalid Value | Expected Message                             | Status |
| --- | -------- | ------------- | -------------------------------------------- | ------ |
| 1   | email    | "invalid"     | "Please enter a valid email address"         | [ ]    |
| 2   | email    | "test@test"   | "Please enter a valid email address"         | [ ]    |
| 3   | password | "123"         | "Password must be at least 8 characters"     | [ ]    |
| 4   | password | "password"    | "Password must contain uppercase and number" | [ ]    |
| 5   | name     | ""            | "Name is required"                           | [ ]    |
| 6   | name     | "a"           | "Name must be at least 2 characters"         | [ ]    |
| 7   | price    | -1            | "Price must be at least 0"                   | [ ]    |
| 8   | rating   | 0             | "Rating must be between 1 and 5"             | [ ]    |
| 9   | rating   | 6             | "Rating must be between 1 and 5"             | [ ]    |
| 10  | ID       | "invalid123"  | "Invalid ID format"                          | [ ]    |
| 11  | page     | 0             | "Page must be at least 1"                    | [ ]    |
| 12  | limit    | 101           | "Limit cannot exceed 100"                    | [ ]    |

## Authentication Errors

| #   | Scenario      | Expected Message | Status |
| --- | ------------- | ---------------- | ------ |
| 1   | No token      | "Unauthorized"   | [ ]    |
| 2   | Invalid token | "Invalid token"  | [ ]    |
| 3   | Expired token | "Token expired"  | [ ]    |

## Authorization Errors

| #   | Role | Action                  | Expected Message                     | Status |
| --- | ---- | ----------------------- | ------------------------------------ | ------ |
| 1   | 👤   | Create restaurant       | "Permission denied"                  | [ ]    |
| 2   | 👤   | Create category         | "Permission denied"                  | [ ]    |
| 3   | 👤   | Delete review           | "Not allowed"                        | [ ]    |
| 4   | 🏪   | Create generic category | "Only superAdmin can create generic" | [ ]    |
| 5   | 🏪   | List all users          | "Permission denied"                  | [ ]    |
| 6   | 👔   | Delete restaurant       | "Permission denied"                  | [ ]    |

## Not Found Errors

| #   | Resource              | Expected Message       | Status |
| --- | --------------------- | ---------------------- | ------ |
| 1   | Invalid restaurant ID | "Restaurant not found" | [ ]    |
| 2   | Invalid category ID   | "Category not found"   | [ ]    |
| 3   | Invalid menu ID       | "Menu not found"       | [ ]    |
| 4   | Invalid review ID     | "Review not found"     | [ ]    |
| 5   | Invalid user ID       | "User not found"       | [ ]    |

## Conflict Errors

| #   | Scenario           | Expected Message                       | Status |
| --- | ------------------ | -------------------------------------- | ------ |
| 1   | Duplicate email    | "Email already exists"                 | [ ]    |
| 2   | Duplicate username | "Username already exists"              | [ ]    |
| 3   | Duplicate category | "Category already exists"              | [ ]    |
| 4   | Duplicate menu     | "Menu already exists for category"     | [ ]    |
| 5   | Duplicate review   | "You already reviewed this restaurant" | [ ]    |

---

# ✅ COMPLETION CHECKLIST

- [ ] All positive test cases passed
- [ ] All error cases tested
- [ ] All role-based access controls verified
- [ ] All validation messages correct
- [ ] Database properly populated with demo data
- [ ] No security vulnerabilities found
- [ ] Performance acceptable

---

## 📝 Notes

_Add your testing notes here:_

---

_Last Updated: 2026-02-28_
