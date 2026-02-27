```
mern-restaurant
├─ api
│  ├─ app.js
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
│  │  ├─ joi-validation-guide.md
│  │  ├─ menu.swagger.js
│  │  ├─ permission-matrix.md
│  │  ├─ postman
│  │  │  └─ category-enterprise-endpoints.postman_collection.json
│  │  ├─ restaurant.swagger.js
│  │  ├─ review.swagger.js
│  │  ├─ swagger.js
│  │  ├─ system.swagger.js
│  │  └─ user.swagger.js
│  ├─ index.js
│  ├─ middlewares
│  │  ├─ errorHandler.js
│  │  ├─ healthCheck.js
│  │  ├─ requestLogger.js
│  │  ├─ validate.js
│  │  └─ zodValidate.js
│  ├─ models
│  │  ├─ auditLog.model.js
│  │  ├─ category.model.js
│  │  ├─ menu.model.js
│  │  ├─ restaurant.model.js
│  │  ├─ review.model.js
│  │  └─ user.model.js
│  ├─ notes.md
│  ├─ routes
│  │  ├─ admin.route.js
│  │  ├─ auditLog.routes.js
│  │  ├─ auth.route.js
│  │  ├─ category.route.js
│  │  ├─ menu.route.js
│  │  ├─ restaurant.routes.js
│  │  ├─ review.route.js
│  │  ├─ user.route.js
│  │  └─ v1
│  │     └─ index.js
│  ├─ tests
│  │  ├─ auth.integration.test.js
│  │  ├─ ENDPOINT_COVERAGE_MATRIX.md
│  │  ├─ gap-closure.integration.test.js
│  │  ├─ helpers
│  │  │  └─ testDb.js
│  │  ├─ platform-core.integration.test.js
│  │  ├─ rbac.contract.test.js
│  │  ├─ roles-and-reviews.integration.test.js
│  │  ├─ route-policy.contract.test.js
│  │  └─ system.integration.test.js
│  ├─ utils
│  │  ├─ auditLogger.js
│  │  ├─ controllerHelpers.js
│  │  ├─ diff.js
│  │  ├─ error.js
│  │  ├─ fileLogger.js
│  │  ├─ generateUniqueSlug.js
│  │  ├─ geocode.js
│  │  ├─ openNow.js
│  │  ├─ paginate.js
│  │  ├─ permissions.js
│  │  ├─ plugins
│  │  │  └─ softDeleteRestore.plugin.js
│  │  ├─ policy.js
│  │  ├─ rateLimit.js
│  │  ├─ restaurantVisibility.js
│  │  ├─ retry.js
│  │  ├─ roleGuards.js
│  │  ├─ sanitizeAuditData.js
│  │  ├─ verifyUser.js
│  │  ├─ withTransaction.js
│  │  └─ zodSchemas.js
│  └─ validators
│     └─ index.js
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
├─ package-lock.json
├─ package.json
└─ README.md

```
