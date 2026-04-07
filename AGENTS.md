# AGENTS.md - MERN Restaurant Development Guide

## Project Overview

This is a MERN stack restaurant application with Express backend (`api/`) and React frontend (`client/`). Uses ES modules throughout.

## Build/Lint/Test Commands

### Backend (API)

```bash
# Development - runs with nodemon
npm run dev

# Production start
npm run start

# Run all tests (Node's native test runner)
npm test

# Run single test file
node --test api/tests/filename.test.js

# Run single test (using grep pattern)
node --test --test-name-pattern="test name" api/tests/filename.test.js

# Run tests with coverage
npm run test:coverage

# Run e2e smoke tests
npm run test:e2e

# Lint
npm run lint
```

### Frontend (Client)

```bash
cd client

# Development server
npm run dev

# Production build
npm run build

# Preview build
npm run preview

# Lint
npm run lint
```

### Database

```bash
npm run migrate          # Run migrations
npm run migrate:rollback # Rollback last migration
npm run migrate:status   # Check migration status
npm run seed             # Seed database
```

## Code Style Guidelines

### General

- Use ES modules (`import`/`export`) - project uses `"type": "module"` in package.json
- Use `const` by default, `let` when mutation needed, never `var`
- Use single quotes for strings with `{ avoidEscape: true }`
- Always use semicolons
- Use 2-space indentation
- No trailing commas
- No trailing whitespace
- End files with newline

### Backend (API) Conventions

#### File Organization

- Routes in `api/routes/`
- Services in `api/services/`
- Middlewares in `api/middlewares/`
- Utils in `api/utils/`
- Tests in `api/tests/`

#### Naming

- Use camelCase for variables/functions
- Use PascalCase for classes/components
- Use kebab-case for file names (e.g., `auth-route.js`)
- Use descriptive names - avoid single letters except in loops

#### Imports

- Order: built-in → external → relative
- Use absolute imports from `api/` root when possible
- Example: `import { Router } from 'express'` not `const express = require('express')`

#### Error Handling

- Use async/await with try-catch for route handlers
- Create custom error classes in `api/utils/error.js`
- Use global error handler middleware
- Always return proper HTTP status codes

#### Validation

- Use Zod for schema validation (preferred)
- Use Joi for legacy validation
- Validate in middleware, not in controllers

#### Database (Mongoose)

- Use async operations
- Implement proper error handling
- Use transactions for multi-document operations
- Implement soft delete where appropriate

#### JWT/Auth

- Use JWT with rotation for sensitive operations
- Implement CSRF protection
- Store refresh tokens securely

### Frontend (Client) Conventions

#### File Organizations

- Components in `client/src/components/`
- Services in `client/src/services/`
- Utils in `client/src/utils/`
- Pages in `client/src/pages/`

#### React Patterns

- Use functional components with hooks
- Use Redux Toolkit for state management
- Use react-router-dom for routing
- Use Tailwind CSS for styling

#### Namings

- Use PascalCase for components
- Use camelCase for functions/variables
- Prefix boolean props with `is`, `has`, `should`
- Use descriptive component names

#### Hooks

- Follow React hooks rules (eslint-plugin-react-hooks)
- Extract custom hooks for reusable logic
- Use useCallback for functions passed to children
- Use useMemo for expensive computations

#### Styling

- Use Tailwind CSS classes
- Use tailwind-merge (`twMerge`) for conditional classes
- Create custom theme in tailwind.config.js

### Linting Rules

#### Backend (eslint.config.js)

- `no-console`: warn (use logger instead)
- `no-unused-vars`: error
- `no-undef`: error
- `prefer-const`: error
- `no-var`: error
- quotes: single
- semi: always
- indent: 2 spaces

#### Client (eslint.config.js)

- Extends ESLint recommended, react-hooks recommended, react-refresh
- Unused vars allowed if starting with uppercase (for React components)

### Prettier

- Prettier requires config (see `.vscode/settings.json`)
- Run `npm run lint -- --fix` to auto-fix issues

## Testing Guidelines

### Test Structure

- Place tests alongside source files or in `api/tests/`
- Use Node's built-in test runner (`node:test`)
- Use `supertest` for HTTP integration tests
- Use `mongodb-memory-server` for database mocking

### Test Naming

- Use descriptive test names: `should return 401 for invalid token`
- Group related tests with `describe()` blocks

### Test Patterns

```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
```

## Security Guidelines

- Never commit secrets to git (use `.env` files)
- Use helmet.js for HTTP headers
- Implement rate limiting
- Sanitize user inputs
- Use parameterized queries (Mongoose handles this)
- Implement proper CORS configuration
