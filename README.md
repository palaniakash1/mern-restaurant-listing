# MERN Restaurant API - Backend Documentation

## Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [API Endpoints](#api-endpoints)
4. [Authentication & Authorization](#authentication--authorization)
5. [Getting Started](#getting-started)
6. [Testing](#testing)
7. [API Documentation](#api-documentation)
8. [Postman Collections](#postman-collections)
9. [Features](#features)
10. [Technology Stack](#technology-stack)

---

## Overview

Enterprise-grade RESTful API for a restaurant listing platform built with Node.js, Express, and MongoDB.

### Key Features:

- JWT-based authentication (access token + CSRF protection for cookie auth)
- Role-based access control (RBAC)
- Multi-tenant restaurant management
- Menu and category management
- Review and rating system
- Audit logging
- API versioning support

---

## Project Structure

```
api/
├── controllers/          # Request handlers
│   ├── admin.controller.js
│   ├── auth.controller.js
│   ├── auditLog.controller.js
│   ├── category.controller.js
│   ├── menu.controller.js
│   ├── restaurant.controller.js
│   ├── review.controller.js
│   └── user.controller.js
├── docs/                # Swagger documentation
│   ├── *.swagger.js
│   └── postman/         # Postman collections
├── middlewares/         # Express middlewares
│   ├── errorHandler.js
│   ├── healthCheck.js
│   ├── requestLogger.js
│   └── validate.js
├── models/              # Mongoose models
│   ├── auditLog.model.js
│   ├── category.model.js
│   ├── menu.model.js
│   ├── restaurant.model.js
│   ├── review.model.js
│   └── user.model.js
├── routes/              # Express routes
│   ├── *.route.js
│   └── v1/             # API versioning
├── tests/               # Integration tests
├── utils/               # Helper functions
│   ├── controllerHelpers.js
│   ├── error.js
│   ├── fileLogger.js
│   ├── permissions.js
│   ├── policy.js
│   ├── retry.js
│   └── zodSchemas.js
├── app.js               # Express app
└── index.js             # Entry point
```

---

## API Endpoints

### Total: 78+ Endpoints

| Module          | Endpoints | Description                                              |
| --------------- | --------- | -------------------------------------------------------- |
| **Auth**        | 6         | Signup, signin, signout, session, OAuth, password change |
| **Users**       | 11        | CRUD, role management, restaurant assignment             |
| **Restaurants** | 16        | CRUD, nearby search, featured, trending                  |
| **Categories**  | 18        | CRUD, bulk operations, soft delete                       |
| **Menus**       | 14        | CRUD, items, reorder, restore                            |
| **Reviews**     | 8         | CRUD, moderation, ratings                                |
| **Admin**       | 1         | User creation                                            |
| **Audit**       | 1         | Log retrieval                                            |
| **System**      | 3         | Health, liveness, readiness                              |

---

## Authentication & Authorization

### Roles

| Role           | Description                |
| -------------- | -------------------------- |
| `user`         | Regular authenticated user |
| `storeManager` | Restaurant manager         |
| `admin`        | Restaurant admin           |
| `superAdmin`   | System administrator       |

### Authentication Flow

```
1. User signs up → receives JWT token
2. User signs in → receives JWT token
3. Token expires → user must re-authenticate
```

### Token Structure

- **Access Token**: Configurable via `JWT_EXPIRE` (default `1h`)

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6+

### Installation

```bash
# Clone the repository
git clone https://github.com/palaniakash1/mern-restaurant-listing.git
cd mern-restaurant

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the server
npm run dev
```

### Environment Variables

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=mongodb://localhost:27017/restaurant
JWT_SECRET=your-secret-key
JWT_EXPIRE=1h
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
METRICS_TOKEN=optional-strong-token
```

---

## Testing

### Run Tests

```bash
npm test
```

### Test Coverage

- **31/31 tests passing**
- Integration tests for all endpoints
- Role-based access control verification

### Test Files

- `api/tests/auth.integration.test.js`
- `api/tests/platform-core.integration.test.js`
- `api/tests/roles-and-reviews.integration.test.js`
- `api/tests/gap-closure.integration.test.js`
- `api/tests/rbac.contract.test.js`
- `api/tests/route-policy.contract.test.js`
- `api/tests/system.integration.test.js`

---

## API Documentation

### Swagger UI

Access at: `http://localhost:3000/api/docs`

### API Versions

- **Legacy**: `http://localhost:3000/api/*`
- **v1**: `http://localhost:3000/api/v1/*`

---

## Postman Collections

Import these JSON files from `api/docs/postman/`:

| File                                                    | Endpoints            |
| ------------------------------------------------------- | -------------------- |
| `auth.postman_collection.json`                          | Authentication (6)   |
| `users.postman_collection.json`                         | User management (11) |
| `restaurants.postman_collection.json`                   | Restaurant CRUD (16) |
| `menu.postman_collection.json`                          | Menu management (14) |
| `reviews.postman_collection.json`                       | Reviews (8)          |
| `category-enterprise-endpoints.postman_collection.json` | Categories (18)      |
| `admin-audit.postman_collection.json`                   | Admin & Audit (2)    |

### Import Instructions

1. Open Postman
2. File → Import
3. Select the JSON file
4. Set `baseUrl` variable to `http://localhost:3000/api`

---

## Features

### Implemented

- ✅ JWT Authentication
- ✅ Role-Based Access Control (RBAC)
- ✅ Policy-Based Authorization
- ✅ Soft Delete & Restore
- ✅ Audit Logging
- ✅ Pagination & Filtering
- ✅ Geolocation Search
- ✅ Image Upload Support
- ✅ API Versioning
- ✅ Request Validation (Joi + Zod)
- ✅ Error Handling
- ✅ Request Logging
- ✅ File Rotation Logging
- ✅ Retry & Circuit Breaker
- ✅ Redis Caching
- ✅ CI/CD Pipeline

### Coming Soon

- 🔄 Real-time Notifications
- 🔄 Payment Integrationf

---

## Technology Stack

| Layer          | Technology                 |
| -------------- | -------------------------- |
| Runtime        | Node.js 18+                |
| Framework      | Express.js                 |
| Database       | MongoDB + Mongoose         |
| Cache          | Redis + In-memory fallback |
| Authentication | JWT + bcrypt               |
| Validation     | Joi + Zod                  |
| Documentation  | Swagger (OpenAPI 3.0)      |
| Testing        | Node.js native test runner |
| CI/CD          | GitHub Actions             |

---

## Redis Caching

### Overview

The API uses Redis for caching public read endpoints to improve performance. If Redis is unavailable, the system automatically falls back to in-memory caching.

### Cached Endpoints

| Endpoint                                  | Description               |
| ----------------------------------------- | ------------------------- |
| `GET /api/restaurants/featured`           | Featured restaurants list |
| `GET /api/categories`                     | Public categories list    |
| `GET /api/menus/restaurant/:id`           | Restaurant menu items     |
| `GET /api/reviews/restaurant/:id`         | Restaurant reviews        |
| `GET /api/reviews/restaurant/:id/summary` | Review ratings summary    |

### Configuration

Add Redis URL to your `.env` file:

```env
REDIS_URL=redis://localhost:6379
```

### Cache TTL

- Default: 300 seconds (5 minutes)
- Configurable via `CACHE_TTL` env variable

### Without Redis

If Redis is not available, the API automatically uses in-memory caching. No configuration needed!

---

## API Endpoint Quick Reference

### Health Check

```
GET /api/health     - Readiness probe
GET /api/live      - Liveness probe
```

### Auth

```
POST /api/auth/signup           - Register new user
POST /api/auth/signin           - Login
POST /api/auth/google           - Google OAuth
POST /api/auth/signout          - Logout
GET  /api/auth/session          - Get current session
POST /api/auth/change-password   - Change password
```

### Users

```
GET    /api/users                    - List users (superAdmin)
GET    /api/users/admins             - List admins (superAdmin)
GET    /api/users/store-managers     - List managers (admin)
POST   /api/users                    - Create user (admin)
PATCH  /api/users/:id                - Update user
DELETE /api/users/:id                - Delete user
PATCH  /api/users/:id/deactivate     - Deactivate user
PATCH  /api/users/:id/restore        - Restore user (superAdmin)
PATCH  /api/users/:id/restaurant     - Assign restaurant
DELETE /api/users/:id/restaurant     - Unassign restaurant
PATCH  /api/users/:id/owner          - Change owner (superAdmin)
```

### Restaurants

```
GET  /api/restaurants                    - List (public)
GET  /api/restaurants/nearby             - Geolocation search
GET  /api/restaurants/featured          - Featured list
GET  /api/restaurants/trending           - Trending list
GET  /api/restaurants/slug/:slug        - Get by slug
POST /api/restaurants                    - Create (admin)
GET  /api/restaurants/me                 - My restaurant (admin)
GET  /api/restaurants/id/:id             - Get by ID (owner)
PATCH /api/restaurants/id/:id            - Update (owner)
DELETE /api/restaurants/id/:id           - Delete (owner)
PATCH /api/restaurants/id/:id/status     - Update status (superAdmin)
PATCH /api/restaurants/id/:id/restore    - Restore (superAdmin)
```

### Categories

```
GET    /api/categories              - List (public)
GET    /api/categories/my          - My categories (admin)
GET    /api/categories/all         - All (superAdmin)
POST   /api/categories             - Create (admin)
PATCH  /api/categories/:id         - Update (owner)
DELETE /api/categories/:id         - Delete (owner)
PATCH  /api/categories/:id/status  - Toggle status
PATCH  /api/categories/:id/restore - Restore (superAdmin)
```

### Menus

```
GET    /api/menus/restaurant/:id       - Get by restaurant
POST   /api/menus                       - Create menu
GET    /api/menus/:id                   - Get menu
PATCH  /api/menus/:id                   - Update menu
DELETE /api/menus/:id                   - Delete menu
POST   /api/menus/:id/items             - Add item
PUT    /api/menus/:id/items/:itemId     - Update item
DELETE /api/menus/:id/items/:itemId     - Delete item
```

### Reviews

```
GET  /api/reviews/restaurant/:id           - List by restaurant
GET  /api/reviews/restaurant/:id/summary   - Rating summary
POST /api/reviews/restaurant/:id           - Create review
PATCH /api/reviews/:id                     - Update review
DELETE /api/reviews/:id                    - Delete review
PATCH /api/reviews/:id/moderate            - Moderate (admin)
```

---

## License

MIT License - See LICENSE file for details

## Author

**Palani Akash**

- GitHub: [@palaniakash1](https://github.com/palaniakash1)

```
mern-restaurant
├─ .nyc_output
│  └─ processinfo
│     └─ index.json
├─ .prettierrc
├─ api
│  ├─ app.js
│  ├─ config.js
│  ├─ controllers
│  │  ├─ admin.controller.js
│  │  ├─ auditLog.controller.js
│  │  ├─ auth.controller.js
│  │  ├─ category.controller.js
│  │  ├─ menu.controller.js
│  │  ├─ restaurant.controller.js
│  │  ├─ review.controller.js
│  │  └─ user.controller.js
│  ├─ docs
│  │  ├─ admin.swagger.js
│  │  ├─ auditLog.swagger.js
│  │  ├─ auth.swagger.js
│  │  ├─ category.swagger.js
│  │  ├─ components.js
│  │  ├─ fsa.swagger.js
│  │  ├─ joi-validation-guide.md
│  │  ├─ menu.swagger.js
│  │  ├─ permission-matrix.md
│  │  ├─ postman
│  │  │  ├─ admin-audit.postman_collection.json
│  │  │  ├─ API_TESTING_CHECKLIST.md
│  │  │  ├─ auth.postman_collection.json
│  │  │  ├─ category-enterprise-endpoints.postman_collection.json
│  │  │  ├─ category_complete.postman_collection.json
│  │  │  ├─ complete-api-test-data.json
│  │  │  ├─ create_demo.cjs
│  │  │  ├─ demo_categories_menus.postman_collection.json
│  │  │  ├─ demo_categories_v2.json
│  │  │  ├─ demo_menus_v2.json
│  │  │  ├─ demo_menu_items.postman_collection.json
│  │  │  ├─ demo_menu_v2.json
│  │  │  ├─ demo_restaurants.postman_collection.json
│  │  │  ├─ demo_restaurants_v2.json
│  │  │  ├─ demo_simple.json
│  │  │  ├─ fsa.postman_collection.json
│  │  │  ├─ menu.postman_collection.json
│  │  │  ├─ restaurants.postman_collection.json
│  │  │  ├─ reviews.postman_collection.json
│  │  │  ├─ STEP_BY_STEP_TESTING.md
│  │  │  ├─ TEST_DATA_REFERENCE.md
│  │  │  └─ users.postman_collection.json
│  │  ├─ restaurant.swagger.js
│  │  ├─ review.swagger.js
│  │  ├─ swagger.js
│  │  ├─ system.swagger.js
│  │  └─ user.swagger.js
│  ├─ index.js
│  ├─ jobs
│  │  └─ fsaRatingRefresh.job.js
│  ├─ load-tests
│  │  ├─ auth-load-test.js
│  │  ├─ README.md
│  │  └─ run-k6.js
│  ├─ middlewares
│  │  ├─ csrfProtection.js
│  │  ├─ errorHandler.js
│  │  ├─ healthCheck.js
│  │  ├─ idempotency.js
│  │  ├─ metrics.js
│  │  ├─ requestLogger.js
│  │  ├─ validate.js
│  │  └─ zodValidate.js
│  ├─ migrations
│  │  ├─ migrate.js
│  │  ├─ migrations
│  │  │  └─ 001_add_indexes.js
│  │  └─ seeds
│  │     ├─ 001_sample_users.js
│  │     └─ demo_data.cjs
│  ├─ models
│  │  ├─ auditLog.model.js
│  │  ├─ category.model.js
│  │  ├─ menu.model.js
│  │  ├─ refreshToken.model.js
│  │  ├─ restaurant.model.js
│  │  ├─ review.model.js
│  │  └─ user.model.js
│  ├─ notes.md
│  ├─ repositories
│  │  ├─ admin.repository.js
│  │  ├─ auth.repository.js
│  │  └─ user.repository.js
│  ├─ routes
│  │  ├─ admin.jwt.route.js
│  │  ├─ admin.route.js
│  │  ├─ auditLog.routes.js
│  │  ├─ auth.route.js
│  │  ├─ category.route.js
│  │  ├─ fsa.routes.js
│  │  ├─ menu.route.js
│  │  ├─ places.routes.js
│  │  ├─ restaurant.routes.js
│  │  ├─ review.route.js
│  │  ├─ user.route.js
│  │  └─ v1
│  │     └─ index.js
│  ├─ services
│  │  ├─ admin.service.js
│  │  ├─ auth.service.js
│  │  ├─ authOperations.service.js
│  │  ├─ fsa.service.js
│  │  ├─ jwtRotation.service.js
│  │  └─ user.service.js
│  ├─ tests
│  │  ├─ admin.repository.test.js
│  │  ├─ app-request-logger.test.js
│  │  ├─ auth-controller.unit.test.js
│  │  ├─ auth-operations.service.test.js
│  │  ├─ auth.integration.test.js
│  │  ├─ auth.service.test.js
│  │  ├─ branch-gap-helpers.unit.test.js
│  │  ├─ controller-branch-2.integration.test.js
│  │  ├─ controller-branch-3.integration.test.js
│  │  ├─ controller-branch-4.integration.test.js
│  │  ├─ controller-branch.integration.test.js
│  │  ├─ controller-deep-branches.unit.test.js
│  │  ├─ e2e-smoke.test.js
│  │  ├─ ENDPOINT_COVERAGE_MATRIX.md
│  │  ├─ fsa.controller.test.js
│  │  ├─ fsa.service.unit.test.js
│  │  ├─ gap-closure.integration.test.js
│  │  ├─ helpers
│  │  │  └─ testDb.js
│  │  ├─ jwt-rotation.edge.test.js
│  │  ├─ jwt-tracing-lifecycle.test.js
│  │  ├─ jwt-tracing.test.js
│  │  ├─ low-coverage-utils.test.js
│  │  ├─ platform-core.integration.test.js
│  │  ├─ rbac.contract.test.js
│  │  ├─ roles-and-reviews.integration.test.js
│  │  ├─ route-policy.contract.test.js
│  │  ├─ runtime-advanced.test.js
│  │  ├─ runtime-hardening.test.js
│  │  ├─ runtime-redis.test.js
│  │  ├─ runtime-unit.test.js
│  │  ├─ system.integration.test.js
│  │  ├─ user-admin.service.test.js
│  │  └─ user-controller.unit.test.js
│  ├─ tracing.js
│  ├─ utils
│  │  ├─ auditLogger.js
│  │  ├─ controllerHelpers.js
│  │  ├─ diff.js
│  │  ├─ error.js
│  │  ├─ fileLogger.js
│  │  ├─ generateUniqueSlug.js
│  │  ├─ geocode.js
│  │  ├─ googlePlaces.js
│  │  ├─ logger.js
│  │  ├─ openNow.js
│  │  ├─ paginate.js
│  │  ├─ permissions.js
│  │  ├─ plugins
│  │  │  └─ softDeleteRestore.plugin.js
│  │  ├─ policy.js
│  │  ├─ rateLimit.js
│  │  ├─ redisCache.js
│  │  ├─ restaurantVisibility.js
│  │  ├─ retry.js
│  │  ├─ roleGuards.js
│  │  ├─ sanitizeAuditData.js
│  │  ├─ secretScanner.js
│  │  ├─ securityTelemetry.js
│  │  ├─ verifyUser.js
│  │  ├─ withTransaction.js
│  │  └─ zodSchemas.js
│  └─ validators
│     └─ index.js
├─ BACKUP_RESTORE_RUNBOOK.md
├─ client
│  ├─ .flowbite-react
│  │  ├─ class-list.json
│  │  ├─ config.json
│  │  └─ init.tsx
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ postcss.config.js
│  ├─ README.md
│  ├─ src
│  │  ├─ App.jsx
│  │  ├─ assets
│  │  │  ├─ eatwisely.ico
│  │  │  └─ wavepattern.png
│  │  ├─ components
│  │  │  ├─ AddressAutocomplete.jsx
│  │  │  ├─ Dashboards.jsx
│  │  │  ├─ DashCategories.jsx
│  │  │  ├─ DashMenu.jsx
│  │  │  ├─ DashProfile.jsx
│  │  │  ├─ DashRestaurants.jsx
│  │  │  ├─ DashSidebar.jsx
│  │  │  ├─ DashUsers.jsx
│  │  │  ├─ Footer.jsx
│  │  │  ├─ Header.jsx
│  │  │  ├─ ImageCircleLoader.jsx
│  │  │  ├─ OAuth.jsx
│  │  │  └─ PrivateRoute.jsx
│  │  ├─ firebase.js
│  │  ├─ index.css
│  │  ├─ main.jsx
│  │  ├─ pages
│  │  │  ├─ About.jsx
│  │  │  ├─ AutoComplete.jsx
│  │  │  ├─ Dashboard.jsx
│  │  │  ├─ Home.jsx
│  │  │  ├─ Profile.jsx
│  │  │  ├─ SignIn.jsx
│  │  │  └─ SignUp.jsx
│  │  └─ redux
│  │     ├─ store.js
│  │     └─ user
│  │        └─ userSlice.js
│  ├─ tailwind.config.js
│  └─ vite.config.js
├─ COMPLETED_WORK_SUMMARY.md
├─ coverage
│  ├─ base.css
│  ├─ block-navigation.js
│  ├─ coverage-final.json
│  ├─ favicon.png
│  ├─ index.html
│  ├─ prettify.css
│  ├─ prettify.js
│  ├─ sort-arrow-sprite.png
│  └─ sorter.js
├─ ENTERPRISE_GAP_CHECKLIST.md
├─ eslint.config.js
├─ JWT_KEY_ROTATION.md
├─ keys
│  ├─ 0464700e-f4f3-44f2-8614-cfe3049fa59f.key
│  ├─ 225dd211-a98c-4964-a32f-820df62d4ea6.key
│  ├─ 23107baf-5010-4268-a57e-559049397776.key
│  ├─ 4c9b5020-eae9-4977-8a3b-43beede8d6d9.key
│  ├─ 4d0817e5-0433-4c5a-99c2-118b6a87faef.key
│  ├─ 50e516d5-00bf-4705-bf5c-3dc04ee576d4.key
│  ├─ 6a68fa23-6d63-4e65-b304-395881b248d4.key
│  ├─ 6cc76fe3-e377-43bd-86fb-45ab22dfb861.key
│  ├─ a1070027-31e3-44d0-8204-f8a6694080b6.key
│  ├─ af4eb789-53cf-40f9-8ad5-c367cbeee01d.key
│  ├─ bfbc14b7-4a29-4f08-a762-340976f4a5ab.key
│  ├─ c49d6fff-dcd3-407f-b2ef-0bb7d63c675e.key
│  ├─ d2742b40-bdbd-4ac9-911f-eaaf8de43a4a.key
│  ├─ d4b4aacd-9ade-4238-993a-216800a4b2cc.key
│  ├─ ea16b998-a35e-4e70-8ee0-09003a8ccb51.key
│  └─ faf7b8e2-4cd8-4daf-85d6-5184dace4978.key
├─ package-lock.json
├─ package.json
├─ Project_Structure.md
├─ README.md
├─ RELEASE_CHECKLIST.md
├─ ROLLBACK_RUNBOOK.md
└─ TEST_COVERAGE_TRACKER.md

```