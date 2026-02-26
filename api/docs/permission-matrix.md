# Permission Matrix (RBAC Baseline)

This matrix defines the intended role-to-capability contract for the API.
It should be treated as the source of truth before wiring centralized policy
middleware across every route.

| Capability Group                                        | superAdmin | admin                | storeManager | user     |
| ------------------------------------------------------- | ---------- | -------------------- | ------------ | -------- |
| System (`health`, `live`, `docs`)                       | Yes        | Yes                  | Yes          | Yes      |
| Auth session flows                                      | Yes        | Yes                  | Yes          | Yes      |
| Create privileged user (`/api/admin/users`)             | Yes        | No                   | No           | No       |
| Read audit logs (`/api/auditlogs`)                      | Full       | Scoped               | No           | No       |
| Users list all/admins                                   | Yes        | No                   | No           | No       |
| Store manager list/manage                               | Yes        | Scoped               | No           | No       |
| Restaurant create/update/delete                         | Full       | Owned only           | No           | No       |
| Restaurant moderation (`status`, `restore`, `reassign`) | Yes        | No                   | No           | No       |
| Category generic/global management                      | Yes        | No                   | No           | No       |
| Category scoped management                              | Yes        | Yes (own restaurant) | No           | No       |
| Menu management                                         | Full       | Scoped               | Scoped       | No       |
| Review moderation                                       | Full       | Scoped               | No           | No       |
| Review CRUD (customer)                                  | No         | No                   | No           | Own only |

## Rollout Recommendation

1. Keep route-level guards for now to avoid regressions.
2. Introduce policy middleware route-by-route using `PERMISSIONS`.
3. Add automated policy contract tests before removing existing guards.

---
