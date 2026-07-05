# Firestore Data Model

Firestore (Native mode) is schemaless — this documents the collections the backend reads/writes so the shape stays consistent. Create the database once (`gcloud firestore databases create --location=<region>`); collections and documents are created on first write.

## `farmers`

One document per registered account. Document ID is auto-generated.

| Field | Type | Notes |
|---|---|---|
| `name` | string | |
| `phoneNumber` | string | Normalized 10-digit number, used as the login identifier |
| `passwordHash` | string | PBKDF2-SHA256 (100k iterations), base64 |
| `passwordSalt` | string | base64url, unique per account |
| `preferences` | map | `{ preferredLanguage, state, district, village, landAreaAcres, defaultSeason }` |
| `createdAt` | string (ISO 8601) | |

**Required index**: single-field equality on `phoneNumber` (Firestore creates single-field indexes automatically).

## `crop_recommendations`, `disease_reports`, `voice_queries`, `alerts`

One document per generated result, written by `/api/recommend`, `/api/disease`, `/api/voice`, `/api/advisory` respectively. Each includes a `farmerId` field (`null` when the caller isn't logged in) and a `createdAt` ISO timestamp, plus the fields specific to that feature (see `backend/src/types/index.ts` for exact shapes written by each route).

**Required composite indexes** (Firestore will refuse the query and return a console link to auto-create these on first use — or predefine them in `firestore.indexes.json` before deploying):

- `crop_recommendations`: `farmerId` ASC, `createdAt` DESC
- `disease_reports`: `farmerId` ASC, `createdAt` DESC
- `voice_queries`: `farmerId` ASC, `createdAt` DESC
- `alerts`: `farmerId` ASC, `createdAt` DESC

These back the `/api/history` endpoint (a farmer's saved recommendations, disease reports, voice queries, and alerts).

## `cache`

Backs `backend/src/utils/cache.ts`, replacing what was Cloudflare KV. Document ID is a sanitized cache key (e.g. `weather:telangana:hyderabad:_`).

| Field | Type | Notes |
|---|---|---|
| `value` | string | JSON-serialized cached response |
| `expiresAtMillis` | number | Epoch millis; checked at read time |

**Recommended**: configure a [Firestore TTL policy](https://cloud.google.com/firestore/docs/ttl) on `expiresAtMillis` so Google automatically deletes expired cache documents (otherwise they're simply ignored on read, but accumulate storage).
