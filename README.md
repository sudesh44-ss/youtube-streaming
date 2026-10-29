# Tubify — All-in-One Content Discovery & Streaming Platform

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.3.0-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%26%20Auth-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Upstash Redis](https://img.shields.io/badge/Upstash-Redis%20Rate%20Limiting-00E599?style=flat-square&logo=redis)](https://upstash.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Deployment: Vercel](https://img.shields.io/badge/Deployment-Vercel-black?style=flat-square&logo=vercel)](https://youtube-streaming-ten.vercel.app)

---

## 🌐 Live Application & Links

- **Production Deployment:** [https://youtube-streaming-ten.vercel.app](https://youtube-streaming-ten.vercel.app)
- **GitHub Repository:** [https://github.com/sudesh44-ss/youtube-streaming](https://github.com/sudesh44-ss/youtube-streaming)
- **Developer Portfolio:** [YOUR_PORTFOLIO_URL](YOUR_PORTFOLIO_URL)
- **Audit Documentation:** [`docs/PRODUCTION_READINESS_AUDIT.md`](docs/PRODUCTION_READINESS_AUDIT.md)

---

## 🌟 Key Features

### 1. Dual Browsing Engine
- **Normal Mode:** Unified, quota-efficient multi-provider search across all active media adapters (YouTube, TMDB, Spotify).
- **Category Mode:** Vertical-first content navigation segmented into 9 curated domains:
  - 🎓 *Study & Education* (Lectures, Commerce, Economics, Competitive Exams)
  - 🎵 *Music & Audio* (Lo-fi, Bollywood, Classical, Instrumental, Workouts)
  - 🎬 *Movies & Cinema* (TMDB trailers, reviews, metadata)
  - 😂 *Comedy* (Stand-up, sketches, comedy shows)
  - 💻 *Technology* (Programming, hardware, AI, reviews)
  - 🎮 *Gaming* (Walkthroughs, esports, highlights)
  - 🎌 *Anime & Animation* (Trailers, episode recaps, clips)
  - 🏆 *Sports* (Match highlights, commentary, analysis)
  - 📰 *News & Insights* (Current affairs, documentaries, editorial)

### 2. Multi-Provider BYOK Architecture
- **Bring Your Own Key (BYOK):** Users can securely link personal API credentials for **YouTube Data API v3**, **TMDB**, and **Spotify**.
- **Hardware-Level Encryption:** Provider credentials stored in Supabase are encrypted at rest using server-side **AES-256-GCM** authenticated encryption (`ENCRYPTION_SECRET`).
- **Zero-Credential Fallback:** Includes built-in curated catalogs (`src/lib/providers/curated-data.ts`) to ensure a smooth browsing experience even before configuring personal API keys.

### 3. Google & YouTube OAuth 2.0 Integration
- Connect personal Google accounts to synchronize YouTube channel subscriptions and video likes directly within Tubify.
- **In-App Non-Intrusive Prompts:** Replaces intrusive browser alert dialogs with a customized modal dialog (`YouTubeConnectionPopup.tsx`).
- Connected account status and associated email display directly in **Settings > Connected Accounts**.

### 4. Dedicated YouTube Music Experience (`/music`)
- Full-featured music streaming dashboard (`src/features/youtube-music`).
- Curated music categories (Chill & Lo-Fi, Bollywood, Classical, Instrumental, Rock, etc.).
- Persistent music playback bar (`MusicPlayerBar.tsx`) allowing uninterrupted playback across route navigation.

### 5. Immersive Watch Experience & Picture-in-Picture Mini-Player
- **Watch Page (`/watch/[videoId]`):** Responsive video embed, rich formatted description rendering, view counts, publish date parsing, channel metadata, and interactive like/subscribe actions.
- **Floating Mini-Player (`FloatingMiniPlayer.tsx`):** Docked video playback widget that keeps playing while navigating between dashboard, settings, or search pages.
- **Playback Resume:** Saves watch progress (`/api/content/watch-progress`) to seamlessly resume long-form videos.

### 6. Channel Profiles (`/channel/[channelId]`)
- Comprehensive creator showcase displaying custom handle (`@username`), subscriber counts, total videos, and channel banner/avatar styling.
- Channel-specific video uploads feed with direct watch page routing.

### 7. Insights, Privacy & 30-Day Data Retention
- **Watch Time Analytics (`/dashboard/insights`):** Monthly watch time breakdown, activity metrics, and search trend heatmaps.
- **Explainable Recommendations:** "Why this video?" cards detailing topic relevance and interest score weighting, with one-click recommendation profile reset.
- **Automated Retention Cleanup:** Scheduled serverless cron endpoint (`/api/cron/cleanup-retention`) running automated cleanup of watch and search history past 30 days (`clean_expired_activity_data`).
- **GDPR Compliance & Export:** Download your data in standard JSON (`/api/user/export`), manage cookie preferences (`CookieConsent.tsx`), and clear local storage collections on demand.

### 8. Enterprise Security & Quota Protection
- **Debounce-Free Search Control:** Explicit submission handling eliminates accidental keystroke debounces, preventing YouTube API quota depletion.
- **Request Race-Condition Guarding:** Monotonic request sequence IDs (`requestIdRef.current`) drop out-of-order responses.
- **Distributed Rate Limiting:** Powered by Upstash Redis REST API with automatic graceful fallback to local memory in offline test environments.
- **Hardened HTTP Headers:** Configured with HSTS preload (`max-age=63072000`), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and restrictive `Permissions-Policy`.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) |
| **Frontend Library** | [React 19](https://react.dev/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling & Icons** | CSS Modules, Modern CSS Variables, [Lucide React](https://lucide.dev/) |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL 15+, Row Level Security, Supabase Auth SSR) |
| **Rate Limiting** | [Upstash Redis](https://upstash.com/) (`@upstash/redis`) |
| **Cryptography** | Node.js `crypto` (AES-256-GCM, SHA-256) |
| **External Providers** | YouTube Data API v3, Google OAuth 2.0, TMDB API, Spotify Web API |
| **Testing** | Node.js Test Runner / `tsx` (Integration, Cryptography, OAuth, Channel, Branding) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## 📂 Repository Structure

```
youtube-streaming/
├── .env.example                       # Reference environment variables template
├── docs/
│   └── PRODUCTION_READINESS_AUDIT.md   # Architectural audit & verification report
├── public/                            # Static assets, branding, and icons
├── src/
│   ├── app/
│   │   ├── (auth)/                    # Login, Register, Forgot Password, Reset Password
│   │   ├── api/
│   │   │   ├── auth/                  # Supabase session & Google OAuth 2.0 endpoints
│   │   │   ├── content/               # Search, recommendations, watch progress, channels
│   │   │   ├── cron/                  # Scheduled 30-day activity retention cleanup
│   │   │   ├── providers/             # Encrypted provider BYOK management
│   │   │   └── user/                  # Profile, preferences, insights, and GDPR export
│   │   ├── channel/[channelId]/       # Channel profile and uploads showcase
│   │   ├── dashboard/                 # Main discovery feed, saved watchlist, history
│   │   ├── discover/                  # Multi-provider unified discovery interface
│   │   ├── help/                      # Searchable help center & API setup guides
│   │   ├── insights/                  # Redirect to dashboard analytics
│   │   ├── music/                     # Dedicated YouTube Music player route
│   │   ├── privacy/                   # Privacy policy & cookie preferences
│   │   ├── settings/                  # User settings, BYOK keys, theme, region, language
│   │   ├── terms/                     # Terms of service
│   │   ├── watch/[videoId]/           # Video player, comments, and related feed
│   │   ├── globals.css                # Global design system & theme tokens
│   │   ├── layout.tsx                 # Root layout with mini-player & theme providers
│   │   └── page.tsx                   # Public landing page with interactive demo
│   ├── components/
│   │   ├── insights/                  # Watch analytics and recommendation score cards
│   │   ├── FloatingMiniPlayer.tsx     # Persistent Picture-in-Picture mini-player
│   │   ├── Navbar.tsx                 # Responsive navigation with session deduplication
│   │   ├── Footer.tsx                 # Footer layout with quick links and copyright
│   │   ├── SearchBar.tsx              # Controlled search bar with autocomplete suggestions
│   │   └── YouTubeConnectionPopup.tsx # Non-intrusive modal for YouTube OAuth actions
│   ├── features/
│   │   └── youtube-music/             # Dedicated YouTube Music player components & types
│   ├── lib/
│   │   ├── i18n/                      # Internationalization (English & Hindi support)
│   │   ├── providers/                 # YouTube, TMDB, Spotify adapters & curated data
│   │   ├── supabase/                  # Supabase client, server, and admin DB utilities
│   │   ├── auth.ts                    # Authentication helpers & password validation
│   │   ├── crypto.ts                  # AES-256-GCM authenticated encryption for API keys
│   │   ├── rate-limit.ts              # Upstash Redis distributed rate limiting
│   │   ├── recommendations.ts         # Topic interest scoring & recommendation algorithms
│   │   └── types.ts                   # Central TypeScript models, categories, and contracts
│   └── middleware.ts                  # Protected route gating & session validation
├── supabase/
│   └── migrations/                    # SQL schemas (users, providers, OAuth, retention)
└── test/                              # Automated platform, endpoint, and UI regression tests
```

---

## ⚙️ Prerequisites & Getting Started

### Prerequisites

- **Node.js**: v20.x or higher (tested with Node.js v26)
- **Package Manager**: `npm` (v10+), `pnpm`, or `yarn`
- **Supabase Account**: An active Supabase project with database & auth configured
- **Upstash Account**: An Upstash Redis database instance (REST API)
- **Google Cloud Console**: Credentials for YouTube Data API v3 and OAuth 2.0 (optional for local fallback)

---

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sudesh44-ss/youtube-streaming.git
   cd youtube-streaming
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment template to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

   Fill in your secrets in `.env.local`:

   ```env
   # 1. Server-side Authenticated Encryption (AES-256-GCM)
   # Must be at least 32 characters long
   ENCRYPTION_SECRET=your_32_plus_character_secure_encryption_secret_here

   # 2. Supabase Database & Auth (Project Settings -> API)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-public-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-server-only-service-role-key

   # 3. Upstash Redis (Console -> Redis -> REST API)
   UPSTASH_REDIS_REST_URL=https://your-database-id.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-rest-token

   # 4. Application URL & Google OAuth 2.0 (YouTube Connection)
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret_here

   # 5. Local Dev Admin Fixtures (Active only when NODE_ENV !== 'production')
   DEV_ADMIN_EMAIL=admin@example.com
   DEV_ADMIN_PASSWORD=your_local_testing_password_here

   # 6. Optional Global Provider API Keys (Can also be set in user settings)
   # YOUTUBE_API_KEY=AIzaSy...
   # TMDB_API_KEY=...
   ```

4. **Apply Supabase Database Migrations:**
   Run the SQL scripts in `supabase/migrations/` sequentially inside your Supabase SQL Editor:
   - `20261022000001_initial_schema.sql` (Tables, RLS policies, indexing)
   - `20261024000001_country_and_language.sql` (Preference columns)
   - `20261024000002_retention_cleanup.sql` (30-day retention function & indexes)
   - `20261024000003_oauth_and_recommendations.sql` (OAuth tokens & recommendation tables)
   - `20261025000001_persistent_recommendation_profiles.sql` (Profile scores)

---

## 🚀 Development & Build Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts local Next.js development server at `http://localhost:3000` |
| `npm run build` | Compiles production-optimized Next.js bundle |
| `npm run start` | Serves the production build locally |
| `npm run lint` | Runs ESLint against all source files |
| `npm test` | Runs the automated integration & platform test runner |

### Specific Regression Test Executions

```bash
# Run Tubify branding & channel recovery regression tests
node test/channel-page-and-branding.test.ts

# Run mobile navigation overlay & responsive tests
node test/mobile-navbar-overlay.test.ts

# Run full platform unit & integration suite
npm test
```

---

## 🔒 Security Architecture

- **Authenticated Encryption at Rest (AES-256-GCM):** API keys supplied by users under the BYOK paradigm are encrypted before persistence in PostgreSQL. No plain-text API secrets are exposed to the client or logged.
- **Client Key Masking:** Retrieved API keys are masked (`AIzaSy...XXXX`) using `maskApiKey()` before reaching client state.
- **Distributed Rate Limiting:** Enforces strict per-route limits using Upstash Redis to safeguard endpoints against denial-of-service and brute-force attacks.
- **Serverless Scheduled Data Pruning:** Automatically executes retention procedures on user search and watch histories to enforce 30-day privacy limits.
- **Security Headers:** Strict Transport Security (HSTS), frame-guarding (`SAMEORIGIN`), MIME sniffing prevention (`nosniff`), and strict privacy permissions.

---

## 🚢 Production Deployment (Vercel)

1. Push your code to your GitHub repository:
   ```bash
   git push origin main
   ```
2. Import the repository into your **Vercel** dashboard.
3. Configure the environment variables specified in `.env.example` under **Project Settings > Environment Variables**.
4. In Google Cloud Console, add the production OAuth redirect URI:
   ```
   https://<your-vercel-domain>.vercel.app/api/auth/youtube/callback
   ```
5. Deploy. Vercel automatically detects Next.js 16 and configures serverless edge functions.

---

## 👤 Author & Maintainer

- **Developer:** Sudesh Kumar Surywanshi
- **Email:** [surywanshisudesh543@gmail.com](mailto:surywanshisudesh543@gmail.com)
- **GitHub:** [@sudesh44-ss](https://github.com/sudesh44-ss)
- **Portfolio:** [sudeshcreation.shop](https://sudeshcreation.shop/)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for complete details.
