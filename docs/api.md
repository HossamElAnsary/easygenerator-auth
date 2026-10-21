# API reference

All routes are under `/api`. Every API response sends `Cache-Control: no-store` and a server-generated `X-Request-Id`. The shared schemas in `packages/contracts` define the request rules for the browser and the server alike. The authoritative contract is Architecture A04–A07 in [docs/plan/architecture.md](plan/architecture.md).

## Routes

| Method and path         | Request body                      | Success                                   | Route-specific failures                                     |
| ----------------------- | --------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| `POST /api/auth/signup` | `{ "name", "email", "password" }` | `201 { "user" }`; creates no session      | `400 VALIDATION_ERROR`, `409 EMAIL_IN_USE`                  |
| `POST /api/auth/signin` | `{ "email", "password" }`         | `200 { "user" }` and a new session cookie | `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`           |
| `GET /api/auth/me`      | none; send the session cookie     | `200 { "user" }`                          | `401 UNAUTHENTICATED`                                       |
| `POST /api/auth/logout` | `{}`; session cookie optional     | `204`, cookie expired                     | `503 SERVICE_UNAVAILABLE` if revocation cannot be confirmed |
| `GET /api/health`       | none                              | `200 { "status": "ok" }`                  | `503 { "status": "unavailable" }`                           |

`user` is always exactly `{ "id", "email", "name" }`.

## Validation

- **Email** is trimmed and lowercased (dots and `+` tags are kept), and is at most 254 characters.
- **Name** is trimmed, 3–100 characters.
- **Signup password** is 8–128 characters with at least one letter, one decimal digit, and one punctuation or symbol character. It is never trimmed or normalized.
- **Signin password** may be any nonempty value up to 128 characters, so a password that fails the signup rules gets the generic credential error rather than a policy message.

Lengths count Unicode code points. Unexpected fields are rejected.

## Request controls

Every POST must send `Origin` exactly equal to `APP_ORIGIN`, `X-CSRF-Protection: 1`, and an uncompressed `Content-Type: application/json` body of at most 16 KiB. Otherwise the response is `403 REQUEST_FORBIDDEN`, `415 UNSUPPORTED_MEDIA_TYPE`, or `413 PAYLOAD_TOO_LARGE`, and the handler never runs. CORS is disabled. Browsers send `Origin` themselves; other clients must set it.

## Sessions

Signin issues an opaque 256-bit token in an `HttpOnly`, `SameSite=Lax`, `Path=/` cookie. It is named `session` over local HTTP, and `__Host-session` with `Secure` in production. A session lasts exactly 24 hours from signin, with no renewal, and MongoDB stores only the token's SHA-256 hash. Expiry is enforced on every lookup, not left to TTL cleanup. `GET /api/auth/me` never sets or clears cookies. Logout revokes only the presented session, is idempotent, and expires the cookie only after the deletion is confirmed.

## Errors

Every failure uses `{ "error": { "code", "message", "fields"?, "requestId" } }`, where `fields` appears only for field validation errors. The codes are `VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `UNAUTHENTICATED`, `REQUEST_FORBIDDEN`, `NOT_FOUND`, `EMAIL_IN_USE`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`, and `INTERNAL_ERROR`. Messages never echo input. Unknown API routes return the JSON 404, never the UI page.

## Rate limits

Per route and client IP, per minute: signup 5, signin 10, logout 30, and every other route 120. A `429` includes `Retry-After` in seconds. Counters live in memory, reset on restart, and are not shared across processes. `X-Forwarded-For` is ignored unless `TRUST_PROXY` names the proxy that sets it; the Docker stack's proxy overwrites it.

## Example

This runs in bash or zsh against the Docker stack, with dummy credentials. For `npm run dev`, set `ORIGIN=http://localhost:5173` instead. Signup prints the new user, signin and `me` print the same user, logout prints `204`, and the last request prints a `401` error because the session was revoked. A repeated run gets `409 EMAIL_IN_USE` from signup and then continues.

```sh
ORIGIN=http://localhost:8080
JAR=$(mktemp)
JSON=(-H "Origin: $ORIGIN" -H 'X-CSRF-Protection: 1' -H 'Content-Type: application/json')
curl -s -w '\n' "${JSON[@]}" -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"Analytical-1"}' "$ORIGIN/api/auth/signup"
curl -s -w '\n' -c "$JAR" "${JSON[@]}" -d '{"email":"ada@example.com","password":"Analytical-1"}' "$ORIGIN/api/auth/signin"
curl -s -w '\n' -b "$JAR" "$ORIGIN/api/auth/me"
curl -s -b "$JAR" -c "$JAR" -o /dev/null -w '%{http_code}\n' "${JSON[@]}" -d '{}' "$ORIGIN/api/auth/logout"
curl -s -w '\n' -b "$JAR" "$ORIGIN/api/auth/me"
```
