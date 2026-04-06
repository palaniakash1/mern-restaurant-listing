# Forgot Password Module - Technical Documentation

## Overview

The Forgot Password module enables users to reset their account password through a secure email-based verification flow. This document provides comprehensive details about the implementation, architecture, and usage.

---

## Architecture Overview

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FORGOT PASSWORD FLOW                            │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐
    │  User    │       │  Email   │       │  Email    │       │  User    │
    │ Clicks   │──────▶│  Sent    │──────▶│ Received  │──────▶│  Sets    │
    │ Forgot   │       │ (SMTP)   │       │ Inbox     │       │  New     │
    │ Password  │       │          │       │ (Mailtrap)│       │ Password │
    └──────────┘       └──────────┘       └──────────┘       └──────────┘
         │                                                          │
         │                                                          │
         ▼                                                          ▼
    ┌──────────┐                                            ┌──────────┐
    │  Frontend│                                            │  Backend │
    │  Modal   │                                            │  Validates│
    │  Popup   │                                            │  & Updates│
    └──────────┘                                            └──────────┘

═══════════════════════════════════════════════════════════════════════════

DETAILED FLOW:

1. REQUEST PASSWORD RESET
   ┌─────────────────────────────────────────────────────────────────┐
   │ User clicks "Forgot Password?" on SignIn page                    │
   │          │                                                       │
   │          ▼                                                       │
   │ ┌───────────────────┐                                          │
   │ │  Modal Opens       │                                          │
   │ │  (No page reload) │                                         │
   │ └─────────┬─────────┘                                          │
   │           │                                                      │
   │           ▼                                                      │
   │ ┌─────────────────────────────────────────────────────────────┐   │
   │ │ User enters email: user@example.com                        │   │
   │ └─────────┬─────────────────────────────────────────────────┘   │
   │           │                                                      │
   │           ▼                                                      │
   │ ┌─────────────────────────────────────────────────────────────┐   │
   │ │ POST /api/auth/forgot-password                             │   │
   │ │ Body: { email: "user@example.com" }                        │   │
   │ └─────────┬─────────────────────────────────────────────────┘   │
   └───────────┼─────────────────────────────────────────────────────┘
                │
                ▼
2. BACKEND PROCESSING
   ┌─────────────────────────────────────────────────────────────────┐
   │ api/controllers/auth.controller.js                              │
   │                                                                   │
   │ forgotPassword(req, res, next)                                   │
   │                                                                   │
   │ Step 1: Validate email format                                    │
   │         │                                                        │
   │         ▼                                                        │
   │ Step 2: Find user by email (case-insensitive)                     │
   │         │                                                        │
   │         ▼                                                        │
   │ Step 3: Generate secure token                                     │
   │         │  crypto.randomBytes(32)                                │
   │         │  → Creates 64-character hex string                      │
   │         │                                                        │
   │         ▼                                                        │
   │ Step 4: Hash token with SHA-256                                  │
   │         │  crypto.createHash('sha256')                          │
   │         │  → Ensures token can't be reversed                     │
   │         │                                                        │
   │         ▼                                                        │
   │ Step 5: Store in database                                        │
   │         │  user.security.passwordResetToken = hashedToken         │
   │         │  user.security.passwordResetExpires = +1 hour          │
   │         │                                                        │
   │         ▼                                                        │
   │ Step 6: Send email via configured provider                        │
   │         │  (Mailtrap for dev, Resend for prod)                  │
   │         │                                                        │
   │         ▼                                                        │
   │ Step 7: Return generic response                                  │
   │         │  (Same response whether user exists or not)            │
   │         │  → Prevents email enumeration attacks                  │
   │         │                                                        │
   └─────────┼───────────────────────────────────────────────────────┘
             │
             ▼
3. EMAIL DELIVERY
   ┌─────────────────────────────────────────────────────────────────┐
   │ Email Service (api/services/email.service.js)                  │
   │                                                                   │
   │ Provider Detection:                                              │
   │ ├── mailtrap → SMTP (sandbox.smtp.mailtrap.io)                 │
   │ └── resend   → API (api.resend.com)                            │
   │                                                                   │
   │ Email Content:                                                   │
   │ ├── Subject: "Password Reset - EatWisely"                       │
   │ ├── From: "EatWisely <noreply@eatwisely.com>"                  │
   │ ├── To: [user email]                                           │
   │ └── Body: HTML template with branded styling                    │
   │                                                                   │
   │ Reset Link Format:                                               │
   │ http://localhost:5173/reset-password?                          │
   │   token=abc123...                                               │
   │   &userId=69d276260b7a53845cbe5cee                             │
   │                                                                   │
   └─────────────────────────────────────────────────────────────────┘
             │
             ▼
4. PASSWORD RESET (Separate Request)
   ┌─────────────────────────────────────────────────────────────────┐
   │ User clicks reset link from email                               │
   │                                                                   │
   │ GET /reset-password?token=xxx&userId=xxx                       │
   │                                                                   │
   │ Frontend checks:                                                │
   │ ├── Token exists? → Show reset form                            │
   │ └── Token missing? → Show error state                           │
   │                                                                   │
   └─────────┬───────────────────────────────────────────────────────┘
             │
             ▼
5. SET NEW PASSWORD
   ┌─────────────────────────────────────────────────────────────────┐
   │ User enters new password                                         │
   │                                                                   │
   │ Requirements:                                                    │
   │ ├── Minimum 8 characters                                         │
   │ ├── At least 1 uppercase letter (A-Z)                          │
   │ └── At least 1 number (0-9)                                     │
   │                                                                   │
   │ POST /api/auth/reset-password/:userId                           │
   │ Body: {                                                          │
   │   token: "abc123...",        // Plain token from email           │
   │   password: "NewPass123"     // New password (plain)            │
   │ }                                                               │
   │                                                                   │
   │ Backend Validation:                                              │
   │ ├── Verify userId is valid ObjectId                            │
   │ ├── Find user by userId                                         │
   │ ├── Hash provided token with SHA-256                            │
   │ ├── Compare with stored hash                                    │
   │ ├── Check expiration time                                        │
   │ └── Validate password strength                                   │
   │                                                                   │
   │ If all validations pass:                                         │
   │ ├── Hash new password with bcrypt                               │
   │ ├── Update user.password                                        │
   │ └── Clear reset tokens (one-time use)                          │
   │                                                                   │
   └─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Changes

### User Model Enhancement

**File:** `api/models/user.model.js`

```javascript
// Added to security object
security: {
  // ... existing fields ...

  // NEW: Password Reset Fields
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `passwordResetToken` | String | SHA-256 hashed token stored in DB |
| `passwordResetExpires` | Date | Expiration timestamp (1 hour from generation) |

---

## API Endpoints

### 1. Request Password Reset

```
POST /api/auth/forgot-password
```

**Rate Limiting:** 5 requests per hour (per IP)

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Please enter a valid email address"
}
```

**Security Features:**
- Same response for existing/non-existing emails (prevents enumeration)
- Rate limited to prevent abuse
- Email validation before database lookup

---

### 2. Reset Password

```
POST /api/auth/reset-password/:userId
```

**Rate Limiting:** None (token-based)

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | ObjectId | User's MongoDB ObjectId |

**Request Body:**
```json
{
  "token": "abc123def456...",
  "password": "NewPassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Missing token |
| 400 | Invalid token |
| 400 | Token expired |
| 400 | Password doesn't meet requirements |

---

## Backend Implementation

### Controller Functions

**File:** `api/controllers/auth.controller.js`

#### forgotPassword()

```javascript
export const forgotPassword = async (req, res, next) => {
  // 1. Extract and validate email
  // 2. Normalize email (lowercase, trim)
  // 3. Find user by email
  // 4. Generate reset token (32 bytes)
  // 5. Hash token with SHA-256
  // 6. Set expiration (1 hour)
  // 7. Save to database
  // 8. Send email via email service
  // 9. Return generic success message
}
```

#### resetPassword()

```javascript
export const resetPassword = async (req, res, next) => {
  // 1. Extract token and password from request
  // 2. Validate password format
  // 3. Hash provided token with SHA-256
  // 4. Find user by userId
  // 5. Compare hashed tokens
  // 6. Check token expiration
  // 7. Hash new password with bcrypt
  // 8. Update user document
  // 9. Clear reset tokens
  // 10. Log audit event
  // 11. Return success
}
```

---

## Frontend Implementation

### Component Structure

```
client/src/
├── pages/
│   ├── SignIn.jsx          # Contains forgot password modal
│   ├── ForgotPassword.jsx   # Standalone page (optional)
│   └── ResetPassword.jsx    # Password reset form page
└── components/
    └── PasswordStrength.jsx  # Password strength indicator
```

### SignIn Modal Integration

The forgot password functionality is integrated as a **modal popup** in the SignIn page:

```jsx
// Modal Component
<Modal
  show={showForgotModal}
  onClose={closeForgotModal}
  size="md"
  popup
>
  <Modal.Body>
    {/* Success State */}
    {resetSuccess ? (
      <div>
        <h3>Check Your Email</h3>
        <p>Instructions sent to {resetEmail}</p>
        <Button onClick={closeForgotModal}>Got it</Button>
      </div>
    ) : (
      /* Form State */
      <form onSubmit={handleForgotPassword}>
        <input
          type="email"
          value={resetEmail}
          onChange={(e) => setResetEmail(e.target.value)}
          placeholder="Enter your email"
        />
        <Button type="submit">Send Instructions</Button>
      </form>
    )}
  </Modal.Body>
</Modal>
```

### Reset Password Page

**File:** `client/src/pages/ResetPassword.jsx`

Features:
- Dark themed, immersive design
- Password strength indicator (reusable component)
- Real-time password match validation
- Animated transitions
- Success/error states

### PasswordStrength Component

**File:** `client/src/components/PasswordStrength.jsx`

Reusable component showing password strength:

```jsx
const PasswordStrength = ({ password }) => {
  // Calculates strength based on:
  // - Length >= 8 characters (+1)
  // - Length >= 12 characters (+1)
  // - Contains uppercase (+1)
  // - Contains number (+1)
  // - Contains special character (+1)
  
  // Returns: 0-5 scale with color-coded bars
}
```

---

## Email Service

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    EMAIL SERVICE LAYER                          │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │ sendEmail()     │
                    │ (Main Function) │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
   ┌──────────┐      ┌──────────┐       ┌──────────┐
   │ Mailtrap │      │ Resend   │       │ Ethereal │
   │ (Dev)    │      │ (Prod)   │       │ (Alt)    │
   └──────────┘      └──────────┘       └──────────┘
```

### Configuration

**Environment Variables (.env):**

```env
# ===================
# EMAIL CONFIGURATION
# ===================

# Option 1: Mailtrap (Development - FREE)
EMAIL_PROVIDER=mailtrap
EMAIL_SERVICE_URL=smtps://username:password@sandbox.smtp.mailtrap.io:2525
EMAIL_FROM=EatWisely <noreply@eatwisely.com>

# Option 2: Resend (Production - Free tier: 3,000/day)
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=EatWisely <noreply@yourdomain.com>

# Frontend URL (for reset links)
CLIENT_URL=http://localhost:5173
```

### Email Template

```html
┌────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────┐  │
│ │                     HEADER (#8fa31e)                       │  │
│ │                       EatWisely                            │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │                     CONTENT                               │  │
│ │                                                            │  │
│ │              Password Reset Request                       │  │
│ │                                                            │  │
│ │   You requested to reset your password.                   │  │
│ │   Click the button below:                                │  │
│ │                                                            │  │
│ │   ┌──────────────────────┐                               │  │
│ │   │   Reset Password     │  ← Button (#8fa31e)          │  │
│ │   └──────────────────────┘                               │  │
│ │                                                            │  │
│ │   Or copy this link:                                     │  │
│ │   http://localhost:5173/reset-password?...               │  │
│ │                                                            │  │
│ │   This link expires in 1 hour.                          │  │
│ │                                                            │  │
│ └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

### 1. Token Security

| Measure | Implementation |
|---------|---------------|
| Token Generation | `crypto.randomBytes(32)` - 256 bits of randomness |
| Token Storage | SHA-256 hash (one-way, not reversible) |
| Token Expiry | 1 hour validity window |
| One-time Use | Token cleared after successful reset |

### 2. Protection Against Attacks

| Attack Type | Protection |
|------------|------------|
| Email Enumeration | Same response for existing/non-existing emails |
| Brute Force | Rate limiting (5 requests/hour) |
| Token Guessing | 256-bit random token, SHA-256 hashed |
| Replay Attack | Token cleared after single use |
| Timing Attacks | Constant-time operations |

### 3. Password Requirements

```
Minimum Requirements:
├── Length: 8+ characters
├── Uppercase: At least 1 (A-Z)
└── Number: At least 1 (0-9)

Strength Levels:
├── Weak:     1-2 criteria met
├── Fair:     3 criteria met
├── Good:     4 criteria met
├── Strong:   5 criteria met (includes special char)
└── Very Strong: All criteria + 12+ chars
```

---

## Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMAIL_PROVIDER` | Yes | - | Provider name: `mailtrap`, `resend` |
| `EMAIL_SERVICE_URL` | For mailtrap | - | SMTP connection string |
| `RESEND_API_KEY` | For resend | - | Resend API key |
| `EMAIL_FROM` | Yes | - | Sender email address |
| `CLIENT_URL` | Yes | `http://localhost:5173` | Frontend base URL |

### Rate Limiting

| Endpoint | Window | Max Requests |
|----------|--------|--------------|
| `/api/auth/forgot-password` | 60 minutes | 5 |
| `/api/auth/reset-password/:userId` | None | Unlimited |

---

## Testing Guide

### 1. Setup

```bash
# Install dependencies
npm install nodemailer

# Start backend
npm run dev

# Start frontend
cd client && npm run dev
```

### 2. Test Flow

#### Step 1: Register Test User
```
1. Go to http://localhost:5173/sign-up
2. Create account with test email
3. Verify signup successful
```

#### Step 2: Request Password Reset
```
1. Go to http://localhost:5173/sign-in
2. Click "Forgot Password?"
3. Enter test email
4. Click "Send Instructions"
5. Check Mailtrap inbox (https://mailtrap.io/inboxes)
```

#### Step 3: Reset Password
```
1. Open email in Mailtrap
2. Click reset link
3. Enter new password
4. Submit
5. Login with new password
```

### 3. Mailtrap Setup

1. Create account at https://mailtrap.io
2. Go to "Email Testing" → "Inboxes"
3. Copy SMTP credentials:
   ```
   Host: sandbox.smtp.mailtrap.io
   Port: 2525
   Username: [from dashboard]
   Password: [from dashboard]
   ```
4. Update `.env`:
   ```env
   EMAIL_PROVIDER=mailtrap
   EMAIL_SERVICE_URL=smtps://USER:PASS@sandbox.smtp.mailtrap.io:2525
   ```

---

## Production Deployment

### When Ready for Production

1. **Choose Email Provider**
   - Resend (recommended): 3,000 free emails/day
   - Amazon SES: Cheapest at scale
   - SendGrid: Industry standard

2. **Set Up Domain**
   ```
   For Resend:
   1. Go to resend.com/domains
   2. Add your domain (e.g., yourapp.com)
   3. Add DNS records (TXT, MX, DKIM)
   4. Wait for verification
   5. Update EMAIL_FROM to use your domain
   ```

3. **Update Environment**
   ```env
   # Production .env
   NODE_ENV=production
   CLIENT_URL=https://yourapp.com
   
   # Resend (example)
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_production_key
   EMAIL_FROM=EatWisely <noreply@yourapp.com>
   ```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|---------|
| Email not received | Mailtrap not configured | Check `.env` settings |
| 403 Error (Resend) | Domain not verified | Verify domain in Resend dashboard |
| Token expired | >1 hour since request | Request new reset link |
| Invalid token | Token already used or tampered | Request new reset link |
| User not found | Email doesn't exist | Check email spelling |

### Debug Mode

Enable debug logging in development:

```javascript
// Temporary addition to email.service.js
console.log('[DEBUG] Email config:', config);
console.log('[DEBUG] Reset URL:', resetUrl);
```

---

## File Structure

```
mern-restaurant/
├── api/
│   ├── controllers/
│   │   └── auth.controller.js      # forgotPassword, resetPassword
│   ├── services/
│   │   └── email.service.js        # Email sending logic
│   ├── models/
│   │   └── user.model.js           # User schema with reset fields
│   ├── routes/
│   │   └── auth.route.js           # API route definitions
│   ├── validators/
│   │   └── index.js               # Request validation
│   └── config.js                   # Environment config
│
└── client/src/
    ├── pages/
    │   ├── SignIn.jsx              # Forgot password modal
    │   └── ResetPassword.jsx        # Reset password page
    ├── components/
    │   └── PasswordStrength.jsx    # Password strength indicator
    └── services/
        └── authService.js           # API calls for auth
```

---

## Summary

| Component | Technology |
|-----------|------------|
| Token Generation | Node.js `crypto` |
| Token Hashing | SHA-256 |
| Password Hashing | bcrypt (existing) |
| Email Sending | Nodemailer + Mailtrap/Resend |
| Rate Limiting | Redis (existing infrastructure) |
| Validation | Joi (existing) |
| Audit Logging | Existing audit system |

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-06  
**Module Status:** ✅ Production Ready (for development with Mailtrap)
