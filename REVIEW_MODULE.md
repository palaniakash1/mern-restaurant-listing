# Review Module Documentation

## Overview

The Review Module is a comprehensive system for managing customer reviews in the EatWisely restaurant platform. It supports multiple user roles with different access levels, image uploads, bulk moderation, and enterprise-grade features like audit logging and caching.

---

## Features

### 1. User Roles & Permissions

| Role             | Capabilities                                                    |
| ---------------- | --------------------------------------------------------------- |
| **Public User**  | Post reviews, view own reviews, delete own reviews              |
| **Admin**        | Moderate reviews for assigned restaurant, bulk moderate         |
| **SuperAdmin**   | View/moderate ALL reviews across all restaurants, bulk moderate |
| **StoreManager** | View reviews for assigned restaurant (read-only)                |

### 2. Core Functionality

- **Post Reviews**: Public users can rate (1-5 stars), comment, and upload up to 3 images
- **Auto-Hide**: New reviews are hidden by default, requiring admin approval
- **Moderation**: Admins can approve (make visible) or hide reviews
- **Bulk Actions**: Select multiple reviews for batch approval/hiding
- **Image Gallery**: Click images to view in lightbox with thumbnails and navigation

### 3. Technical Features

- Redis caching for performance
- Audit logging for compliance
- Transaction support for data integrity
- Input validation and sanitization
- Image upload to Cloudinary

---

## API Endpoints

### Public Endpoints

| Method | Endpoint                                        | Description                            |
| ------ | ----------------------------------------------- | -------------------------------------- |
| GET    | `/api/reviews/restaurant/:restaurantId`         | Get visible reviews for a restaurant   |
| GET    | `/api/reviews/restaurant/:restaurantId/summary` | Get rating summary (avg rating, count) |

### Protected Endpoints (Requires Authentication)

| Method | Endpoint                                    | Access           | Description                                         |
| ------ | ------------------------------------------- | ---------------- | --------------------------------------------------- |
| GET    | `/api/reviews/all`                          | SuperAdmin only  | Get ALL reviews across restaurants                  |
| GET    | `/api/reviews/restaurant/:restaurantId/all` | Admin/SuperAdmin | Get all reviews (including hidden) for a restaurant |
| GET    | `/api/reviews/my`                           | User/SuperAdmin  | Get current user's own reviews                      |
| GET    | `/api/reviews/:id`                          | Owner/SuperAdmin | Get a specific review by ID                         |
| POST   | `/api/reviews/restaurant/:restaurantId`     | User             | Create a new review                                 |
| PATCH  | `/api/reviews/bulk-moderate`                | Admin/SuperAdmin | Bulk approve/hide reviews                           |
| PATCH  | `/api/reviews/:id/moderate`                 | Admin/SuperAdmin | Approve/hide a single review                        |
| DELETE | `/api/reviews/:id`                          | Owner/SuperAdmin | Delete a review                                     |

---

## Request/Response Formats

### Create Review

``` 
POST /api/reviews/restaurant/:restaurantId

Request Body:
{
  "rating": 5,           // Required, number 1-5
  "comment": "Great food!",  // Optional, max 1000 chars
  "images": ["url1", "url2"] // Optional, max 3 URLs
}

Response:
{
  "success": true,
  "data": { ...review }
}
```

### Bulk Moderate

```
PATCH /api/reviews/bulk-moderate

Request Body:
{
  "reviewIds": ["id1", "id2", "id3"], // Array of review IDs
  "isActive": true // true = approve, false = hide
}

Response:
{
  "success": true,
  "data": {
    "modifiedCount": 3
  }
}
```

### List Reviews (Admin)

```
GET /api/reviews/restaurant/:restaurantId/all?page=1&limit=10&sort=desc

Response:
{
  "success": true,
  "page": 1,
  "limit": 10,
  "total": 25,
  "totalPages": 3,
  "data": [ ...reviews ]
}
```

---

## Database Schema

### Review Model (`api/models/review.model.js`)

```javascript
{
  restaurantId: ObjectId,    // Required, references Restaurant
  userId: ObjectId,         // Required, references User
  rating: Number,           // Required, 1-5
  comment: String,          // Optional, max 1000 chars
  images: [String],         // Optional, array of image URLs (max 3)
  isActive: Boolean,        // Default: true (public), false (pending approval)
  moderatedBy: ObjectId,   // References User who approved/hid
  moderatedAt: Date,       // Timestamp of moderation
  createdAt: Date,          // Auto-generated
  updatedAt: Date           // Auto-generated
}
```

### Indexes

- `{ restaurantId: 1, isActive: 1, createdAt: -1 }` - For filtering and sorting
- `{ restaurantId }` - For restaurant lookups
- `{ userId }` - For user lookups
- `{ isActive }` - For filtering visible/hidden reviews

---

## Frontend Components

### DashReviews.jsx

The main review management component with role-based UI:

#### Public User View

- **Post a Review** - Form to submit new review with rating, comment, images
- **Your Reviews** - Grid of user's own reviews with search/filter
- Delete button for own reviews

#### Admin/SuperAdmin View

- **Review Registry** - Card grid of all reviews
- Filter tabs: All | Visible | Hidden
- Restaurant dropdown filter (SuperAdmin sees all, Admin sees own)
- Checkbox selection for bulk actions
- Bulk Approve/Hide buttons
- Image lightbox gallery
- Pagination with item count

---

## User Flows

### 1. Public User Posts Review

1. User navigates to Reviews page
2. Selects restaurant from dropdown
3. Selects star rating (1-5)
4. Optionally adds comment
5. Optionally uploads up to 3 images
6. Submits review
7. Review is created with `isActive: false` (pending approval)
8. Success message shown

### 2. Admin Moderates Reviews

1. Admin logs in
2. Navigates to Reviews page
3. Sees all reviews for their restaurant
4. Can filter by: All, Visible, Hidden
5. Can select reviews using checkboxes
6. Clicks "Approve" or "Hide" to bulk moderate
7. Or clicks individual Approve/Hide buttons
8. Reviews update immediately

### 3. SuperAdmin Moderates All Reviews

1. SuperAdmin logs in
2. Navigates to Reviews page
3. Sees ALL reviews from ALL restaurants
4. Can filter by restaurant using dropdown
5. Same moderation features as admin

---

## Permissions Matrix

### Backend Permissions (`api/utils/permissions.js`)

| Action   | superAdmin | admin | user | storeManager |
| -------- | ---------- | ----- | ---- | ------------ |
| readMine | ✓          | -     | ✓    | -            |
| readById | ✓          | ✓     | ✓    | -            |
| create   | -          | -     | ✓    | -            |
| update   | ✓          | -     | ✓    | -            |
| delete   | ✓          | -     | ✓    | -            |
| moderate | ✓          | ✓     | -    | -            |

---

## Caching Strategy

The module uses Redis caching for performance:

- **Key Pattern**: `reviews:restaurant:{restaurantId}:{page}:{limit}:{sort}`
- **TTL**: 300 seconds (5 minutes)
- **Invalidation**: On create, update, delete, or moderate operations

---

## Audit Logging

All review actions are logged for compliance:

- **CREATE**: When a new review is posted
- **UPDATE**: When a review is edited
- **DELETE**: When a review is deleted
- **STATUS_CHANGE**: When review is approved/hidden
- **BULK_STATUS_CHANGE**: When multiple reviews are bulk moderated

---

## Image Handling

### Upload Flow

1. User selects images in the review form (max 3)
2. Images are previewed locally using FileReader
3. On submit, images are uploaded to Cloudinary
4. Cloudinary URLs are stored with the review

### Gallery Lightbox

- Click any image thumbnail to open
- Shows large image with navigation arrows
- Thumbnails at bottom for quick navigation
- Click outside or X to close

---

## Error Handling

| Error Code | Message                             | Cause                                     |
| ---------- | ----------------------------------- | ----------------------------------------- |
| 400        | Invalid restaurant ID format        | Invalid MongoDB ObjectId                  |
| 400        | rating must be between 1 and 5      | Invalid rating value                      |
| 400        | reviewIds must be a non-empty array | Empty or invalid bulk request             |
| 403        | Permission denied                   | User doesn't have permission              |
| 403        | Not your restaurant                 | Admin trying to moderate other restaurant |
| 404        | Review not found                    | Invalid review ID                         |
| 409        | Duplicate key error                 | Database constraint violation             |

---

## Configuration

### Environment Variables

```
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_UPLOAD_FOLDER=restaurants
```

### Validators (`api/validators/index.js`)

- `createBody`: Validates rating (1-5), comment, images (max 3)
- `moderateBody`: Validates isActive boolean
- `bulkModerateBody`: Validates reviewIds array and isActive

---

## Testing Checklist

- [ ] Public user can post a review with images
- [ ] New review is hidden until approved
- [ ] Admin can see reviews for their restaurant
- [ ] Admin can approve/hide individual reviews
- [ ] Admin can bulk select and moderate reviews
- [ ] SuperAdmin can see ALL reviews
- [ ] SuperAdmin can filter by restaurant
- [ ] Image lightbox opens and navigates correctly
- [ ] Pagination shows correct counts
- [ ] Audit logs are created for all actions

---

## Future Enhancements

1. **Reply to Reviews** - Allow restaurants to respond to reviews
2. **Report Abuse** - Users can flag inappropriate reviews
3. **Email Notifications** - Notify users when their review is approved
4. **Analytics Dashboard** - Charts showing review trends
5. **Search** - Full-text search on review comments

---

## Version History

| Version | Date    | Changes                                |
| ------- | ------- | -------------------------------------- |
| 1.0     | Initial | Basic review CRUD                      |
| 1.1     | Added   | Image upload support                   |
| 1.2     | Added   | Bulk moderation                        |
| 1.3     | Added   | Auto-hide on create, approval workflow |
