# Backend Endpoint Coverage Matrix

Legend:

- `P` = positive path
- `A` = auth/role guard
- `V` = validation / bad input
- `O` = ownership / scope guard
- `Gap` = no automated integration coverage yet

## System

| Method | Endpoint      | Guard  | Coverage | Test File                    |
| ------ | ------------- | ------ | -------- | ---------------------------- |
| GET    | `/api/health` | Public | P        | `system.integration.test.js` |
| GET    | `/api/live`   | Public | P        | `system.integration.test.js` |
| GET    | `/api/docs`   | Public | P        | `system.integration.test.js` |

## Auth

| Method | Endpoint                    | Guard         | Coverage | Test File                  |
| ------ | --------------------------- | ------------- | -------- | -------------------------- |
| POST   | `/api/auth/signup`          | Public        | P,V      | `auth.integration.test.js` |
| POST   | `/api/auth/signin`          | Public        | P,V      | `auth.integration.test.js` |
| POST   | `/api/auth/google`          | Public        | Gap      | -                          |
| POST   | `/api/auth/signout`         | Authenticated | P        | `auth.integration.test.js` |
| GET    | `/api/auth/session`         | Authenticated | P        | `auth.integration.test.js` |
| POST   | `/api/auth/change-password` | Authenticated | P,V      | `auth.integration.test.js` |

## Users

| Method | Endpoint                    | Guard            | Coverage | Test File                               |
| ------ | --------------------------- | ---------------- | -------- | --------------------------------------- |
| GET    | `/api/users/test`           | superAdmin       | Gap      | -                                       |
| GET    | `/api/users`                | superAdmin       | P,A      | `platform-core.integration.test.js`     |
| GET    | `/api/users/admins`         | superAdmin       | P        | `roles-and-reviews.integration.test.js` |
| GET    | `/api/users/store-managers` | admin/superAdmin | P,A      | `roles-and-reviews.integration.test.js` |
| POST   | `/api/users`                | admin/superAdmin | Gap      | -                                       |
| PATCH  | `/api/users/:id`            | self/superAdmin  | Gap      | -                                       |
| DELETE | `/api/users/:id`            | self/superAdmin  | Gap      | -                                       |
| PATCH  | `/api/users/:id/deactivate` | self/superAdmin  | Gap      | -                                       |
| PATCH  | `/api/users/:id/restore`    | superAdmin       | Gap      | -                                       |
| PATCH  | `/api/users/:id/restaurant` | admin/superAdmin | Gap      | -                                       |
| PATCH  | `/api/users/:id/owner`      | superAdmin       | P        | `roles-and-reviews.integration.test.js` |
| DELETE | `/api/users/:id/restaurant` | admin/superAdmin | P,O      | `roles-and-reviews.integration.test.js` |

## Admin

| Method | Endpoint           | Guard      | Coverage | Test File                           |
| ------ | ------------------ | ---------- | -------- | ----------------------------------- |
| POST   | `/api/admin/users` | superAdmin | P,A,V    | `platform-core.integration.test.js` |

## Audit Logs

| Method | Endpoint         | Guard            | Coverage | Test File                           |
| ------ | ---------------- | ---------------- | -------- | ----------------------------------- |
| GET    | `/api/auditlogs` | admin/superAdmin | P,A      | `platform-core.integration.test.js` |

## Restaurants

| Method | Endpoint                              | Guard            | Coverage | Test File                           |
| ------ | ------------------------------------- | ---------------- | -------- | ----------------------------------- |
| GET    | `/api/restaurants`                    | Public           | P        | `platform-core.integration.test.js` |
| GET    | `/api/restaurants/nearby`             | Public           | Gap      | -                                   |
| GET    | `/api/restaurants/featured`           | Public           | Gap      | -                                   |
| GET    | `/api/restaurants/trending`           | Public           | Gap      | -                                   |
| GET    | `/api/restaurants/slug/:slug`         | Public           | P        | `platform-core.integration.test.js` |
| GET    | `/api/restaurants/slug/:slug/details` | Public           | Gap      | -                                   |
| POST   | `/api/restaurants`                    | admin/superAdmin | P,A      | `platform-core.integration.test.js` |
| GET    | `/api/restaurants/me`                 | admin            | P        | `platform-core.integration.test.js` |
| GET    | `/api/restaurants/me/summary`         | admin            | Gap      | -                                   |
| GET    | `/api/restaurants/all`                | superAdmin       | P,A      | `platform-core.integration.test.js` |
| GET    | `/api/restaurants/id/:id`             | owner/superAdmin | P,O      | `platform-core.integration.test.js` |
| PATCH  | `/api/restaurants/id/:id`             | owner/superAdmin | P,O      | `platform-core.integration.test.js` |
| DELETE | `/api/restaurants/id/:id`             | owner/superAdmin | P        | `platform-core.integration.test.js` |
| PATCH  | `/api/restaurants/id/:id/status`      | superAdmin       | P        | `platform-core.integration.test.js` |
| PATCH  | `/api/restaurants/id/:id/restore`     | superAdmin       | P,A      | `platform-core.integration.test.js` |
| PATCH  | `/api/restaurants/id/:id/admin`       | superAdmin       | P        | `platform-core.integration.test.js` |

## Categories

| Method | Endpoint                       | Guard            | Coverage | Test File                           |
| ------ | ------------------------------ | ---------------- | -------- | ----------------------------------- |
| GET    | `/api/categories`              | Public           | P        | `platform-core.integration.test.js` |
| GET    | `/api/categories/my`           | admin            | Gap      | -                                   |
| GET    | `/api/categories/all`          | superAdmin       | P,A      | `platform-core.integration.test.js` |
| GET    | `/api/categories/deleted`      | superAdmin       | Gap      | -                                   |
| GET    | `/api/categories/export`       | superAdmin       | Gap      | -                                   |
| PATCH  | `/api/categories/bulk-status`  | superAdmin       | P,A,V    | `platform-core.integration.test.js` |
| PATCH  | `/api/categories/bulk-reorder` | admin/superAdmin | Gap      | -                                   |
| PATCH  | `/api/categories/reorder`      | admin/superAdmin | Gap      | -                                   |
| POST   | `/api/categories/check-slug`   | admin/superAdmin | P,O      | `platform-core.integration.test.js` |
| POST   | `/api/categories`              | admin/superAdmin | P,A      | `platform-core.integration.test.js` |
| PATCH  | `/api/categories/:id/status`   | admin/superAdmin | Gap      | -                                   |
| PATCH  | `/api/categories/:id/restore`  | superAdmin       | Gap      | -                                   |
| DELETE | `/api/categories/:id/hard`     | superAdmin       | P        | `platform-core.integration.test.js` |
| GET    | `/api/categories/:id/audit`    | admin/superAdmin | Gap      | -                                   |
| GET    | `/api/categories/:id`          | admin/superAdmin | Gap      | -                                   |
| PATCH  | `/api/categories/:id`          | admin/superAdmin | A,O      | `platform-core.integration.test.js` |
| DELETE | `/api/categories/:id`          | admin/superAdmin | Gap      | -                                   |

## Menus

| Method | Endpoint                                        | Guard         | Coverage | Test File                           |
| ------ | ----------------------------------------------- | ------------- | -------- | ----------------------------------- |
| POST   | `/api/menus`                                    | authenticated | P        | `platform-core.integration.test.js` |
| GET    | `/api/menus/restaurant/:restaurantId`           | Public        | P        | `platform-core.integration.test.js` |
| GET    | `/api/menus/deleted`                            | authenticated | P,A      | `platform-core.integration.test.js` |
| POST   | `/api/menus/:menuId/items`                      | authenticated | P        | `platform-core.integration.test.js` |
| PUT    | `/api/menus/:menuId/items/:itemId`              | authenticated | P,V,O    | `platform-core.integration.test.js` |
| DELETE | `/api/menus/:menuId/items/:itemId`              | authenticated | P        | `platform-core.integration.test.js` |
| PATCH  | `/api/menus/:menuId/items/:itemId/availability` | authenticated | P        | `platform-core.integration.test.js` |
| PATCH  | `/api/menus/:menuId/status`                     | authenticated | P        | `platform-core.integration.test.js` |
| PUT    | `/api/menus/:menuId/reorder`                    | authenticated | P        | `platform-core.integration.test.js` |
| PATCH  | `/api/menus/:menuId/restore`                    | authenticated | Gap      | -                                   |
| GET    | `/api/menus/:menuId/audit`                      | authenticated | Gap      | -                                   |
| DELETE | `/api/menus/:menuId/hard`                       | superAdmin    | P,A      | `platform-core.integration.test.js` |
| GET    | `/api/menus/:menuId`                            | authenticated | P        | `platform-core.integration.test.js` |
| DELETE | `/api/menus/:menuId`                            | authenticated | P        | `platform-core.integration.test.js` |

## Reviews

| Method | Endpoint                                        | Guard                           | Coverage | Test File                               |
| ------ | ----------------------------------------------- | ------------------------------- | -------- | --------------------------------------- |
| GET    | `/api/reviews/restaurant/:restaurantId`         | Public                          | P        | `roles-and-reviews.integration.test.js` |
| GET    | `/api/reviews/restaurant/:restaurantId/summary` | Public                          | P        | `roles-and-reviews.integration.test.js` |
| GET    | `/api/reviews/my`                               | authenticated user              | Gap      | -                                       |
| GET    | `/api/reviews/:id`                              | scoped (owner/admin/superAdmin) | P,O      | `roles-and-reviews.integration.test.js` |
| POST   | `/api/reviews/restaurant/:restaurantId`         | authenticated user              | P,A,V    | `roles-and-reviews.integration.test.js` |
| PATCH  | `/api/reviews/:id`                              | owner/superAdmin                | P,O      | `roles-and-reviews.integration.test.js` |
| DELETE | `/api/reviews/:id`                              | owner/superAdmin                | Gap      | -                                       |
| PATCH  | `/api/reviews/:id/moderate`                     | admin/superAdmin                | P,O      | `roles-and-reviews.integration.test.js` |
