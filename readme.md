# Samarth Kisan AI — Smart Water, Crop & Advisory System

AI-powered advisory platform that helps Indian farmers make data-driven decisions using satellite data, weather forecasts, groundwater information, and soil health data — combined with Gemini AI.

**Production App:** [https://samarth-kisan-ai.pages.dev/](https://samarth-kisan-ai.pages.dev/)  
**Demo Login Credentials:** Phone: `9999999999` | OTP: `123456`

## The Problem

Farmers often face crop failure from unpredictable monsoons and a lack of data-driven guidance — crop choices are based on habit or hearsay rather than soil health, groundwater depth, or rainfall data, leading to financial loss and wasted resources.

## The Solution

Samarth Kisan AI fuses four live/derived data sources — **weather, soil, groundwater, satellite (NDVI)** — and asks Gemini 2.5 Flash to reason over them with an explicit anti-hallucination system prompt: every recommendation must cite the underlying data and carry a confidence score. Farmers interact through a mobile-first web app, a photo-based disease detector (Gemini Vision), and a voice assistant supporting 9 Indian languages — and can create a free account to save their farm details, preferences, and activity history.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Astro.js, TailwindCSS, TypeScript |
| Backend | Cloudflare Workers, Hono.js, TypeScript |
| Database | Google Cloud Firestore |
| Storage | Google Cloud Storage (crop disease images) |
| Cache | Firestore `cache` collection (weather/soil/groundwater/satellite response cache) |
| Auth | Firebase Authentication — Phone/SMS OTP. Backend verifies ID tokens with Google's public keys (no Admin SDK, no auth secret) |
| AI | Gemini 2.5 Flash (text + structured JSON), Gemini Vision (image analysis) |
| Maps | Leaflet.js |
| Charts | Chart.js |
| Icons | Lucide |

### Why Firestore instead of Cloud SQL or Cloudflare D1?

The backend runs on Cloudflare Workers, which can't hold the persistent TCP connection Cloud SQL (or a VPC-bound service like Memorystore) requires. Firestore and Cloud Storage both expose a plain REST API, so the Worker talks to them the same way it talks to Gemini or Open-Meteo — a `fetch()` call authenticated with a Google service account (JWT signed via Web Crypto, exchanged for an OAuth2 token; see `backend/src/services/googleAuthService.ts`). No Node-only Google SDK needed, so it stays Workers-compatible.

**If you'd rather keep a SQL schema**, [Turso](https://turso.tech) (hosted libSQL/SQLite) is the closest drop-in free alternative — it has an HTTP driver that works the same way from Workers. `backend/src/db/firestore-schema.md` documents every collection/field the app writes, which is enough to hand-write an equivalent `CREATE TABLE` schema if you'd rather migrate to a SQL store.

### Why Firebase Phone Auth instead of a custom login?

Firebase Authentication's phone/SMS-OTP flow only runs from a browser (it needs a live reCAPTCHA challenge tied to the request), so it's the one piece of the stack that lives in the **frontend**, using the `firebase` npm package — everything else stays on the Worker. After Firebase verifies the OTP client-side, it hands back a signed ID token; the frontend sends that token to the backend as a normal bearer token, and the backend verifies it itself (fetches Google's public signing keys, checks the RS256 signature and standard claims — see `backend/src/services/firebaseAuthService.ts`). No Firebase Admin SDK, no server-side auth secret: verification is pure public-key cryptography over Web Crypto, so it runs on Workers same as everything else here.

A Firebase project *is* a GCP project, so `GCP_PROJECT_ID` doubles as the Firebase project ID — you don't create or configure a separate project for auth.

## Project Structure

```text
samarth-ai/
├── backend/                       Cloudflare Worker (Hono API)
│   ├── src/
│   │   ├── index.ts                Worker entry — routes, CORS, error handling
│   │   ├── routes/                 One file per API resource
│   │   ├── middleware/auth.ts      optionalAuth / requireAuth (Firebase ID token bearer)
│   │   ├── services/                Business logic (weather, soil, groundwater,
│   │   │                            satellite, gemini, crop, disease, voice, advisory,
│   │   │                            auth, history, firebaseAuth, googleAuth, firestore, gcs)
│   │   ├── data/                   Static reference data (crop database)
│   │   ├── db/firestore-schema.md  Firestore collections & required indexes
│   │   ├── utils/                  Response helpers, validation (zod), Firestore-backed cache,
│   │   │                            Google/JWT crypto helpers (Web Crypto only)
│   │   └── types/                  Shared TypeScript interfaces + Env bindings
│   └── wrangler.toml
│
├── frontend/                      Astro + Tailwind app
│   ├── src/
│   │   ├── pages/                  One .astro file per route (login is phone+OTP; signup redirects to it)
│   │   ├── components/             Reusable UI (cards, charts, map, voice widget...)
│   │   ├── layouts/BaseLayout.astro
│   │   ├── services/api.ts         Typed fetch client — auto-attaches the Firebase ID token as a bearer token
│   │   ├── i18n/translations.ts    UI string dictionary (en/hi/bn/mr/te/ta)
│   │   ├── utils/                  Constants, formatting, toast, theme, i18n, geolocation,
│   │   │                            firebase.ts (lazy-loaded Phone Auth), icon registry, chart/map init
│   │   ├── types/                  Mirrors backend response shapes
│   │   └── styles/global.css       Glassmorphism + gradient design system
│   └── astro.config.mjs
│
└── .env.example
```

Clean separation is enforced end-to-end: **routes** only validate + delegate, **services** hold all business/AI/data-access logic, **utils** are stateless helpers, **types** are the single source of truth for data shapes on each side.

---

## Features

1. **Crop Recommendation** — state/district/village/land area/season/preference → fused weather+soil+groundwater+NDVI → Gemini ranks 3 crops with yield, water need, risk, reasons, confidence.
2. **Weather Intelligence** — current conditions, 7-day forecast, AI-generated plain-language irrigation advice.
3. **Dry Spell Alerts** — rule-based detection (low rain + high temp + low soil moisture) with Gemini-authored advisory text and one-tap SMS send.
4. **Groundwater** — depth, availability status, recharge trend, water risk, AI-recommended irrigation method with reasoning.
5. **Satellite Dashboard** — NDVI, vegetation health, crop stress flag, health score, map view.
6. **Crop Disease Detection** — photo upload → stored in Cloud Storage → Gemini Vision → disease, confidence, treatment, fertilizer, expert recommendation.
7. **Voice Assistant** — mic button using the browser's Web Speech API for STT/TTS, Gemini for the answer, in Hindi, English, Telugu, Tamil, Kannada, Marathi, Punjabi, Gujarati, Bengali.
8. **Farmer Dashboard** — one-screen rollup of alerts, weather, soil, water, crop health, quick AI insight, and rainfall/temperature/crop-health charts.
9. **Notifications** — advisory alerts are generated as SMS-ready text (rain, dry spell, disease, fertilizer, harvest); push/voice delivery hooks are stubbed for a real provider.
10. **Accounts** — sign in with just a phone number + SMS OTP (Firebase Phone Auth, no password), save your name, preferred language, farm location, land area, and default season, and every recommendation, disease report, voice query, and alert generated while logged in is saved to your account and viewable on the `/account` history page. All feature forms auto-fill from your saved preferences when you're logged in. Using the app without an account still works — accounts are additive, not required.
11. **Low-literacy-friendly design** — a step-by-step wizard for crop recommendation (one question per screen: tap-to-detect location, a slider for land area, icon-chips for season and crop, review-then-submit) instead of one long form; a "Use My Location" button (GPS → reverse geocode) everywhere a location would otherwise need typing; a live weather widget on Home using icon-based metrics; and a language switcher (English, Hindi, Bengali, Marathi, Telugu, Tamil) that also sets the voice assistant's default speech language. All icons are Lucide SVGs — no emoji anywhere in the UI.

### Honest MVP notes (what's real vs. simulated)

| Data | Status |
| --- | --- |
| Weather | **Real** — [Open-Meteo](https://open-meteo.com) (no API key required) |
| Soil | **Real**, best-effort — [ISRIC SoilGrids](https://www.isric.org/explore/soilgrids); falls back to a deterministic simulation if the point has no data |
| Groundwater | **Simulated** — India-WRIS requires a partner key; the service is structured so a real integration drops in at `backend/src/services/groundwaterService.ts` |
| Satellite / NDVI | **Simulated** — Sentinel Hub / NASA AppEEARS require paid credentials; integration point is in `backend/src/services/satelliteService.ts` |
| SMS delivery | **Stubbed** — advisory text is always generated; actual sending needs an `SMS_API_KEY` (MSG91/Twilio) wired into `backend/src/services/advisoryService.ts` |
| Speech-to-text / text-to-speech | **Real, client-side** — uses the browser's Web Speech API (`SpeechRecognition` / `SpeechSynthesis`) so no paid STT/TTS key is needed for the MVP |
| Accounts / auth | **Real** — Firebase Authentication (Phone/SMS OTP); backend verifies ID tokens against Google's public keys, no server-side auth secret |
| Database / storage / cache | **Real** — Firestore + Google Cloud Storage on Google Cloud's free tier (see quotas below) |

All simulated services are deterministic (seeded by state/district name) so demos are stable and reproducible, and every real API call has a graceful fallback so the app never hard-fails on an upstream outage.

**Google Cloud free tier** (as of this writing — verify current limits in the console): Firestore gives 1 GiB storage + 50K reads / 20K writes / 20K deletes per day free forever; Cloud Storage gives 5 GB-months free in certain regions. A hackathon/demo/small-village deployment comfortably fits inside this without a billing account being charged.

**Firebase Phone Auth costs real money past a small free quota** — Firebase's Identity Platform bills per SMS verification once you exceed the free tier (a handful of verifications/day are typically free; check current pricing in the Firebase Console before a real launch). For local development, add [test phone numbers](https://firebase.google.com/docs/auth/web/phone-auth#test-with-fictional-phone-numbers) in the Firebase Console (Authentication → Sign-in method → Phone → Phone numbers for testing) so you can develop without sending real SMS or spending money.

---

## API Reference (`backend/src`)

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/api/weather` | GET | — | `?state&district&village` → current + 7-day forecast |
| `/api/soil` | GET | — | Soil pH, NPK, texture, moisture |
| `/api/groundwater` | GET | — | Depth, risk, recharge trend, irrigation advice |
| `/api/satellite` | GET | — | NDVI, vegetation health, health score |
| `/api/crops` | GET | — | Static crop reference data, optional `?season=` filter |
| `/api/recommend` | POST | optional | Full Gemini-powered crop recommendation; saved to history if logged in |
| `/api/disease` | POST | optional | `multipart/form-data` image upload → Gemini Vision diagnosis; saved to history if logged in |
| `/api/voice` | POST | optional | `{ query, language }` → Gemini answer for the voice assistant; saved to history if logged in |
| `/api/advisory` | GET | optional | Dry-spell/rain alert check for a location; saved to history if logged in |
| `/api/advisory/sms` | POST | — | Send (or stub) an SMS for a generated alert |
| `/api/images/:key` | GET | — | Proxies crop images out of the private Cloud Storage bucket |
| `/api/geocode/reverse` | GET | — | `?lat&lon` → best-effort state/district (never fails — falls back to nearest known state) |
| `/api/auth/session` | POST | required | Call right after Firebase confirms the OTP — creates the Firestore profile on first sign-in, fetches it otherwise |
| `/api/auth/me` | GET | required | Current farmer's profile |
| `/api/profile` | GET/PUT | required | Read or update saved profile (name, language, location, land area, default season) |
| `/api/history` | GET | required | The logged-in farmer's saved crop recommendations, disease reports, voice queries, and alerts |

"optional" auth means the endpoint works anonymously; pass `Authorization: Bearer <firebase-id-token>` (the frontend does this automatically once logged in) to also save the result to your account. "required" means a valid Firebase ID token is mandatory — the frontend fetches one via `getIdToken()` in `src/utils/firebase.ts`, which the SDK auto-refreshes. Every endpoint returns `{ success: true, data }` or `{ success: false, error: { code, message } }`, validated with `zod` and typed end-to-end.

---

## Setup & Hosting

Everything below is one linear path: accounts → install → configure three external services (Google Cloud, Firebase, Gemini) → run locally → deploy both halves to Cloudflare → verify production. Each step tells you exactly what to copy where.

### Step 0 — Accounts & tools you need

| What | Why | Get it |
| --- | --- | --- |
| Node.js 20+ | Runs both the frontend and backend tooling | [nodejs.org](https://nodejs.org) |
| Cloudflare account | Hosts the Worker (backend) and Pages site (frontend) | [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) — free tier is enough |
| Google Cloud project with billing **enabled** | Firestore + Cloud Storage (free-tier usage isn't charged, but the APIs require billing to be turned on) | [console.cloud.google.com](https://console.cloud.google.com) |
| Gemini API key | Powers every AI feature | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — free tier available |
| `gcloud` CLI (optional but faster) | Scripts the Google Cloud setup in Step 2 | [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install) — or do the equivalent clicks in the Console |

### Step 1 — Clone and install

```bash
git clone <your-fork-or-repo-url> samarth-ai   # or just use the project folder you already have
cd samarth-ai
npm install                                     # installs both frontend/ and backend/ workspaces
npx wrangler login                              # opens a browser to connect your Cloudflare account
```

### Step 2 — Google Cloud: database, storage, service account

```bash
# 1. Point gcloud at your project and turn on the two APIs this app uses
gcloud config set project YOUR_PROJECT_ID
gcloud services enable firestore.googleapis.com storage.googleapis.com

# 2. Create the Firestore database (Native mode) — pick a region close to your users
gcloud firestore databases create --location=asia-south1

# 3. Create the Cloud Storage bucket that holds crop disease photos
gcloud storage buckets create gs://samarth-kisan-ai-images --location=asia-south1

# 4. Create a service account the Worker authenticates as, with just the two roles it needs
gcloud iam service-accounts create samarth-kisan-ai \
  --display-name="Samarth Kisan AI backend"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:samarth-kisan-ai@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:samarth-kisan-ai@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# 5. Download a JSON key for that service account — you'll copy two fields out of it, then delete it
gcloud iam service-accounts keys create key.json \
  --iam-account=samarth-kisan-ai@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

No `gcloud` CLI? Do the same five things by hand in the Console: **Firestore** (create database, Native mode) → **Cloud Storage** (create bucket) → **IAM & Admin → Service Accounts** (create one, grant it "Cloud Datastore User" + "Storage Object Admin", then "Keys → Add key → JSON" to download it).

Open the downloaded `key.json` — you need two fields from it in Step 5:

- `client_email` → becomes `GCP_SERVICE_ACCOUNT_EMAIL`
- `private_key` → becomes `GCP_SERVICE_ACCOUNT_PRIVATE_KEY` (keep the `\n` line breaks exactly as they appear)

**Delete `key.json` once you've copied those two values out — never commit it, it's a live credential.**

Finally, pre-create the composite indexes `/api/history` needs (or skip this — Firestore will return an error containing a direct link to auto-create each one the first time the query actually runs, which is the easier path in practice):

- `crop_recommendations`, `disease_reports`, `voice_queries`, `alerts` — each needs a composite index on `farmerId` (ascending) + `createdAt` (descending).

### Step 3 — Firebase: enable phone sign-in

A Firebase project *is* a GCP project, so go to the [Firebase Console](https://console.firebase.google.com) and **add Firebase to the same project** you just used in Step 2, rather than creating a new one.

1. **Authentication → Sign-in method** → enable **Phone**.
2. **Authentication → Sign-in method → Phone → Phone numbers for testing** → add a few fictional numbers (e.g. `+91 9999999999` / code `123456`) so you can develop and demo without sending real SMS or paying for it.
3. **Project settings → Your apps** → add a **Web app** (skip Firebase Hosting, you're not using it) → copy the config values (`apiKey`, `authDomain`, `projectId`, `appId`) — you'll need these in Step 5.
4. **Authentication → Settings → Authorized domains** — `localhost` is authorized by default; you'll add your production domain here in Step 8.

No backend secret is needed for any of this — token verification is public-key crypto against Google's own keys (see "Why Firebase Phone Auth instead of a custom login?" above).

### Step 4 — Gemini API key

Grab a key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — this is a separate product from Google Cloud/Firebase above, no extra project setup needed.

### Step 5 — Configure local environment files

The root [`.env.example`](.env.example) is a consolidated reference of every variable; the two files below are what's actually read locally.

```bash
# Backend — Worker-only secrets, read by `wrangler dev`
cd backend
cp .dev.vars.example .dev.vars
```

Edit `backend/.dev.vars`:

```text
GEMINI_API_KEY=<from Step 4>
GCP_SERVICE_ACCOUNT_EMAIL=<client_email from key.json>
GCP_SERVICE_ACCOUNT_PRIVATE_KEY="<private_key from key.json>"
```

Also edit `backend/wrangler.toml` → `[vars]` → set `GCP_PROJECT_ID` and `GCS_BUCKET_NAME` to match what you created in Step 2.

```bash
# Frontend — public config, read by Astro/Vite
cd ../frontend
cp .env.example .env
```

Edit `frontend/.env`:

```text
PUBLIC_FIREBASE_API_KEY=<apiKey from Step 3>
PUBLIC_FIREBASE_AUTH_DOMAIN=<authDomain from Step 3>
PUBLIC_FIREBASE_PROJECT_ID=<projectId from Step 3>
PUBLIC_FIREBASE_APP_ID=<appId from Step 3>
```

(`PUBLIC_API_BASE_URL` can stay at its default `http://localhost:8787` for local dev.)

### Step 6 — Run it locally

```bash
# terminal 1
cd backend && npm run dev      # http://localhost:8787

# terminal 2
cd frontend && npm run dev     # http://localhost:4321
```

Open `http://localhost:4321`, try a Crop Recommendation for any Indian state/district, and log in with one of the Firebase test phone numbers from Step 3 to confirm the OTP flow works end to end before deploying anything.

### Step 7 — Deploy the backend (Cloudflare Workers)

```bash
cd backend
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GCP_SERVICE_ACCOUNT_EMAIL
npx wrangler secret put GCP_SERVICE_ACCOUNT_PRIVATE_KEY   # paste the multi-line PEM value, including \n's as real line breaks
npm run deploy
```

Note the deployed Worker URL from the command output — it looks like `https://samarth-kisan-ai-backend.<your-subdomain>.workers.dev`.

### Step 8 — Deploy the frontend (Cloudflare Pages)

```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=samarth-kisan-ai
```

Then, in the Cloudflare dashboard → your Pages project → **Settings → Environment variables**, add:

- `PUBLIC_API_BASE_URL` = the Worker URL from Step 7
- `PUBLIC_FIREBASE_API_KEY`, `PUBLIC_FIREBASE_AUTH_DOMAIN`, `PUBLIC_FIREBASE_PROJECT_ID`, `PUBLIC_FIREBASE_APP_ID` = the same values from Step 5

Redeploy after adding them (`npx wrangler pages deploy dist --project-name=samarth-kisan-ai` again) so the build picks them up.

Finally, add the Pages deployment's domain (the `*.pages.dev` URL, plus any custom domain) to **Firebase Console → Authentication → Settings → Authorized domains** — phone sign-in fails silently from unauthorized domains.

### Step 9 — Verify production

- `GET https://<worker>.workers.dev/health` → `{ "status": "ok" }`
- Open the Pages URL and log in with a phone number (a Firebase test number, unless you want a real SMS charge) to confirm the OTP flow works end to end.
- Run a Crop Recommendation for any Indian state/district to confirm the full weather → soil → groundwater → satellite → Gemini pipeline works, then check `/account` to confirm it was saved to your history.

### Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `403` / `PERMISSION_DENIED` from Firestore or Storage | The service account is missing a role — re-run the two `add-iam-policy-binding` commands in Step 2, or check IAM in the Console. |
| Firestore query error mentioning "requires an index" | Expected on `/api/history`'s first real use — click the link in the error to auto-create the index, or pre-create it as described in Step 2. |
| Phone OTP never arrives / silently fails | Domain isn't in Firebase's Authorized domains list (Step 3/8), or you're testing from a domain other than `localhost`/your deployed one. Use a Firebase test phone number while developing. |
| `auth/too-many-requests` from Firebase | Real SMS rate limiting — switch to a test phone number (Step 3) for development. |
| Gemini calls fail with 401/403 | `GEMINI_API_KEY` wasn't set — for local dev check `backend/.dev.vars`, for production re-run `wrangler secret put GEMINI_API_KEY`. |
| Frontend can't reach the backend (CORS or network errors) | `PUBLIC_API_BASE_URL` is wrong or unset — check `frontend/.env` locally, or the Pages project's environment variables in production. |
| Everything 500s right after `wrangler deploy` | A secret is missing — `wrangler secret put` doesn't validate the value, so a typo'd private key (broken `\n`s) fails at request time, not deploy time. Re-paste it carefully. |

---

## Design System

Modern, minimal, "government + AI" aesthetic: rounded glass cards (`backdrop-blur` + translucent surfaces), green gradients (`kisan-500` → `kisan-700`), Lucide icons, dark mode via a `class` strategy toggle persisted to `localStorage`, and subtle motion (fade-in, slide-up, floating hero illustrations) for a native-app feel on low-end phones.
