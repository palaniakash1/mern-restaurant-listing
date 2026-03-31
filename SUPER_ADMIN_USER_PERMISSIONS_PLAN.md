# Super Admin User Permission Rollout Plan

## Goal

Replicate the reference "Create Staff Profile" behavior in our dashboard user-creation flow so a `superAdmin` can create privileged users and assign access using grouped toggle switches.

## Current State

- Backend privileged-user creation already exists at `POST /api/admin/users`.
- Access is already restricted to `superAdmin`.
- Authorization is currently role-only through `PERMISSIONS` and `can(...)`.
- The dashboard has a user list and edit drawer, but no dedicated privileged-user creation experience.

## Implementation Plan

### 1. Backend Permission Model

- Add support for optional per-user custom permissions on the `User` model.
- Keep role defaults as the baseline source of truth.
- Treat custom permissions as a restricted override of the selected role:
  - No custom permissions provided: use role defaults.
  - Custom permissions provided: use only the granted subset of that role's defaults.
- Add shared helpers to:
  - normalize permission payloads
  - validate permission subsets against the selected role
  - resolve effective permissions at runtime

### 2. API Changes

- Extend `POST /api/admin/users` validation to accept:
  - `permissions`
  - `isActive`
- Persist the permission override and status when a super admin creates a user.
- Return permission metadata in the create response so the UI can confirm what was saved.

### 3. Authorization Integration

- Update policy checks so route guards can read custom user permissions from `req.user`.
- Extend auth/session hydration so `verifyToken` and session reads include custom permissions.
- Preserve existing behavior for users without custom overrides.

### 4. Dashboard UX

- Add a super-admin-only "Create Staff Profile" section to the users dashboard.
- Mirror the reference interaction pattern with:
  - personal details inputs
  - role template selector
  - grouped permission cards with toggle switches
  - select all / clear all helpers
  - account status toggle
- Pre-fill toggles from the selected role template, while still allowing manual changes.
- Submit to the existing privileged-user API.

### 5. Verification

- Add focused backend tests covering:
  - custom permission validation
  - privileged-user creation with overrides
  - policy enforcement using custom permissions
- Run targeted test and syntax/lint verification for touched files.

## Guardrails

- Do not broaden access beyond each role's existing permission envelope.
- Keep `superAdmin` as the only actor allowed to create custom privileged users.
- Avoid changing unrelated user-management behavior outside the new create flow.
