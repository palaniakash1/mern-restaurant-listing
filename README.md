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

- JWT-based authentication with refresh tokens
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

- **Access Token**: 1 hour expiry
- **Refresh Token**: 7 days expiry

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
- ✅ CI/CD Pipeline

### Coming Soon

- 🔄 Redis Caching
- 🔄 Real-time Notifications
- 🔄 Payment Integration

---

## Technology Stack

| Layer          | Technology                 |
| -------------- | -------------------------- |
| Runtime        | Node.js 18+                |
| Framework      | Express.js                 |
| Database       | MongoDB + Mongoose         |
| Authentication | JWT + bcrypt               |
| Validation     | Joi + Zod                  |
| Documentation  | Swagger (OpenAPI 3.0)      |
| Testing        | Node.js native test runner |
| CI/CD          | GitHub Actions             |

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
