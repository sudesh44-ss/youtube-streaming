export interface HelpArticle {
  slug: string;
  title: string;
  category: "Getting Started" | "Authentication & Account" | "Discovery & Search" | "API Integrations" | "Privacy & Security" | "Troubleshooting";
  summary: string;
  updatedDate: string;
  content: string;
  relatedSlugs: string[];
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "getting-started",
    title: "Getting Started with the Platform",
    category: "Getting Started",
    summary: "Welcome to the all-in-one content discovery platform. Learn about core features, layout, and how to begin.",
    updatedDate: "October 2026",
    relatedSlugs: ["creating-an-account", "understanding-dashboard", "normal-mode", "category-mode"],
    content: `
### Purpose
Welcome to the All-in-One Content Discovery Platform. This guide outlines how the platform unites educational materials, music, movies, gaming, technology, sports, and news into a unified discovery dashboard.

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge).
- Internet connectivity.
- A free user account to unlock personalized recommendations, custom API keys, and saved watchlists.

### Quick Tour
1. **Public Exploration**: Browse public landing previews, view terms, privacy policies, and documentation without an account.
2. **Account Creation**: Sign up using your email and a strong password to create your private discovery space.
3. **Browsing Modes**: Switch between Normal Mode (broad, cross-interest discovery) and Category Mode (laser-focused exploration).
4. **API Connections**: Optionally provide your personal YouTube Data API v3 or TMDB v3 API keys in Settings to unlock unlimited live search quotas.

### Expected Result
You will have an active workspace configured to your language and topical interests.
    `,
  },
  {
    slug: "creating-an-account",
    title: "Creating an Account & Verification",
    category: "Authentication & Account",
    summary: "Step-by-step instructions on registration, password criteria, and legal acceptance.",
    updatedDate: "October 2026",
    relatedSlugs: ["signing-in-password-reset", "getting-started", "privacy-data-controls"],
    content: `
### Purpose
Learn how to register a personal account with strong security controls and explicit legal consent.

### Prerequisites
- A valid email address.
- A password of at least 8 characters containing both letters and numbers.

### Step-by-Step Instructions
1. Navigate to the **Create Account** page from the top navigation bar.
2. Enter your full name and email address.
3. Choose a password and verify it matches the confirmation field.
4. Review the clickable links to our **Terms & Conditions** and **Privacy Policy**.
5. Check the mandatory acceptance boxes to acknowledge our data processing terms.
6. Click **Create Account**.

### Security Notes
- Passwords are never stored in plaintext; they are salted and hashed using PBKDF2 with 100,000 iterations.
- Your legal acceptance timestamp and terms version are permanently recorded for compliance.
    `,
  },
  {
    slug: "signing-in-password-reset",
    title: "Signing In and Password Reset",
    category: "Authentication & Account",
    summary: "How to sign in securely, maintain active sessions, or recover access to your account.",
    updatedDate: "October 2026",
    relatedSlugs: ["creating-an-account", "privacy-data-controls"],
    content: `
### Purpose
Safely log in to your account and reset forgotten passwords without exposing account existence to attackers.

### Sign In Steps
1. Navigate to the **Sign In** screen.
2. Enter your registered email address and password.
3. Click **Sign In**. On success, you are redirected to the Dashboard.

### Forgotten Password Procedure
1. On the Sign In page, click **Forgot Password?**.
2. Enter your account email address.
3. The server generates a secure reset token.
4. Follow the instructions to enter your new password.

### Security Defenses
We employ generic feedback responses to prevent email enumeration attacks by third parties.
    `,
  },
  {
    slug: "understanding-dashboard",
    title: "Understanding the Dashboard",
    category: "Discovery & Search",
    summary: "An overview of navigation, category tabs, filter chips, and interactive cards.",
    updatedDate: "October 2026",
    relatedSlugs: ["category-mode", "normal-mode", "searching-content"],
    content: `
### Purpose
The Dashboard is your primary mission control for discovery.

### Key Layout Elements
- **Mode Selector**: Toggle effortlessly between Normal Mode and Category Mode in the header.
- **Category Bar**: Horizontally scrollable row containing Study, Music, Movies, Technology, Gaming, Anime, Sports, and News.
- **Search Header**: Unified omnibar with debounced auto-querying, history drop-down, and clear button.
- **Content Grid**: Responsive cards displaying thumbnails, titles, creators, publication dates, and quick save icons.
- **Playback Modal**: Clicking any card opens a preview modal with embedded video streaming, trailer links, or artist attribution.
    `,
  },
  {
    slug: "category-mode",
    title: "Category Mode Deep Dive",
    category: "Discovery & Search",
    summary: "How Category Mode isolates results, enforces subcategory filters, and excludes unrelated media.",
    updatedDate: "October 2026",
    relatedSlugs: ["normal-mode", "understanding-dashboard", "searching-content"],
    content: `
### Purpose
When studying for exams, researching deep technical architectures, or seeking pure lo-fi beats, distractions can derail focus. Category Mode provides complete content isolation.

### How It Operates
- **Strict Filtering**: Queries are routed exclusively through providers supporting that category.
- **Unrelated Exclusion**: Content from other categories is actively rejected by the backend ranking engine.
- **Subcategory Navigation**: Clicking subcategory chips (e.g. Accounting, Economics, Cybersecurity, Lo-fi) refines the server query.
    `,
  },
  {
    slug: "normal-mode",
    title: "Normal Mode Discovery",
    category: "Discovery & Search",
    summary: "Cross-category exploration mixing education, cinema, music, and gaming into one personalized feed.",
    updatedDate: "October 2026",
    relatedSlugs: ["category-mode", "managing-recommendations"],
    content: `
### Purpose
Normal Mode is designed for serendipitous exploration across all your interests.

### Features
- Aggregates results across YouTube, TMDB, and music providers simultaneously.
- Incorporates your saved watchlist history and user preference weightings.
- Balances high-relevance educational lectures with trending entertainment and world news.
    `,
  },
  {
    slug: "searching-content",
    title: "Searching for Content",
    category: "Discovery & Search",
    summary: "Utilizing advanced keywords, category scopes, language filters, and recent search history.",
    updatedDate: "October 2026",
    relatedSlugs: ["category-mode", "understanding-dashboard"],
    content: `
### Purpose
Master the unified search interface across disparate third-party APIs.

### Search Capabilities
- **Scope Awareness**: In Category Mode, your query is automatically scoped to the active topic.
- **Clear & Retry**: Instant reset button with loading skeletons and provider failure isolation.
- **History Tracking**: Past searches are stored in your private history and can be recalled with one click.
    `,
  },
  {
    slug: "managing-recommendations",
    title: "Managing Recommendations",
    category: "Discovery & Search",
    summary: "How the recommendation engine ranks content and how to reset or tune your preferences.",
    updatedDate: "October 2026",
    relatedSlugs: ["normal-mode", "privacy-data-controls"],
    content: `
### Purpose
Understand our transparent rule-based recommendation signals.

### Ranking Factors
1. **Active Category Relevance**: Primary weight in Category Mode.
2. **Explicit Interests**: Your configured preferred categories in Settings.
3. **Saved Content Signals**: Content similar to your saved watchlist receives positive scoring.
4. **Recency**: Freshness boosts for items published in current and previous calendar years.

You can reset recommendation signals at any time in **Settings -> Content & Preferences**.
    `,
  },
  {
    slug: "connecting-youtube",
    title: "Connecting YouTube Data API v3",
    category: "API Integrations",
    summary: "Step-by-step guide on creating a Google Cloud project and obtaining a YouTube Data API v3 key.",
    updatedDate: "October 2026",
    relatedSlugs: ["api-key-security", "updating-disconnecting-providers", "understanding-api-quotas"],
    content: `
### Purpose
Connect your personal Google Cloud YouTube API key to enable live video queries with your own API quotas.

### Step-by-Step Instructions
1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Navigate to **APIs & Services -> Library** and search for **YouTube Data API v3**.
4. Click **Enable**.
5. Go to **Credentials -> Create Credentials -> API Key**.
6. (Recommended) Restrict the key to YouTube Data API v3.
7. Return to this platform, open **Settings -> API Connections**, click **Connect** on YouTube, paste the key, and click **Validate & Save**.

### Security Guarantee
Your API key is encrypted on the server with AES-256-GCM and never shared with other users or exposed to the client browser.
    `,
  },
  {
    slug: "connecting-tmdb",
    title: "Connecting TMDB API v3",
    category: "API Integrations",
    summary: "How to register with The Movie Database and generate an API key for cinema discovery.",
    updatedDate: "October 2026",
    relatedSlugs: ["connecting-youtube", "api-key-security"],
    content: `
### Purpose
Obtain movie ratings, official posters, genres, and metadata powered directly by TMDB.

### Step-by-Step Instructions
1. Sign up for a free account at [The Movie Database (TMDB)](https://www.themoviedb.org/).
2. Navigate to your Account Settings -> **API** tab.
3. Request an API Key (Developer).
4. Copy your **API Key (v3 auth)**.
5. In this platform, go to **Settings -> API Connections**, click **Connect** on TMDB, paste your key, and test the connection.
    `,
  },
  {
    slug: "connecting-music-providers",
    title: "Connecting Music Providers",
    category: "API Integrations",
    summary: "Understanding music metadata, Spotify developer tokens, and playback boundaries.",
    updatedDate: "October 2026",
    relatedSlugs: ["connecting-youtube", "api-key-security"],
    content: `
### Purpose
Configure access to music catalogs and metadata.

### Crucial Note on Playback Rights
Third-party music APIs (such as Spotify) offer catalog metadata and limited 30-second audio previews or deep-links, not unrestricted DRM-free full audio streaming. Full playback is supported through YouTube audio streams and licensed lo-fi channels.
    `,
  },
  {
    slug: "api-key-security",
    title: "API Key Security & Encryption Architecture",
    category: "Privacy & Security",
    summary: "Detailed overview of AES-256-GCM authenticated encryption and zero-knowledge client boundaries.",
    updatedDate: "October 2026",
    relatedSlugs: ["privacy-data-controls", "connecting-youtube"],
    content: `
### How Your Keys Are Protected
- **In Transit**: All credential exchanges occur exclusively over TLS 1.3 / HTTPS.
- **At Rest**: Credentials are encrypted with **AES-256-GCM** using unique 96-bit initialization vectors (IVs) and 128-bit authentication tags.
- **No Client Exposure**: Plaintext keys are never returned in JSON API responses. Only masked representations (e.g. \`AIza••••••••487\`) are visible.
- **Isolated Ownership**: Database queries enforce \`user_id\` foreign key isolation, preventing cross-tenant access.
    `,
  },
  {
    slug: "oauth-authorization",
    title: "OAuth Authorization & External Accounts",
    category: "API Integrations",
    summary: "Understanding the difference between raw API keys, bearer tokens, and OAuth consent flows.",
    updatedDate: "October 2026",
    relatedSlugs: ["api-key-security", "updating-disconnecting-providers"],
    content: `
### Purpose
Explain authorization lifecycles. OAuth connections request granular scopes on third-party providers. When available, OAuth prevents users from having to manage raw secrets.
    `,
  },
  {
    slug: "updating-disconnecting-providers",
    title: "Updating and Disconnecting Providers",
    category: "API Integrations",
    summary: "How to safely test new credentials, replace existing keys, or sever provider connections.",
    updatedDate: "October 2026",
    relatedSlugs: ["connecting-youtube", "api-key-security"],
    content: `
### Safe Replacement Protocol
Replacing a key performs real-time validation against the provider before updating the database. If the new key is invalid, your existing working connection is preserved.

### Disconnecting
Clicking **Disconnect** purges the encrypted ciphertext, IV, and auth tag from the database immediately.
    `,
  },
  {
    slug: "managing-profile-preferences",
    title: "Managing Profile and Preferences",
    category: "Authentication & Account",
    summary: "Customizing your display name, default browsing mode, preferred categories, and language.",
    updatedDate: "October 2026",
    relatedSlugs: ["appearance-settings", "privacy-data-controls"],
    content: `
### Profile Customization
Open **Settings -> Profile & Account** to update your display name.
In **Settings -> Content & Preferences**, define whether you prefer opening in Normal or Category Mode, and check off your default topic interests.
    `,
  },
  {
    slug: "appearance-settings",
    title: "Appearance Settings & Accessibility",
    category: "Getting Started",
    summary: "Toggling dark, light, and system themes, compact density, reduced motion, and high contrast.",
    updatedDate: "October 2026",
    relatedSlugs: ["managing-profile-preferences"],
    content: `
### Customizing Visual Display
- **Themes**: Choose Dark Mode, Light Mode, or respect your operating system preference.
- **Reduced Motion**: Disables smooth transitions and animated carousels for users with vestibular sensitivities.
- **High Contrast**: Enforces sharp borders and enhanced font weights.
    `,
  },
  {
    slug: "privacy-data-controls",
    title: "Privacy and Data Controls",
    category: "Privacy & Security",
    summary: "Exporting your personal data, clearing search history, and reviewing active sessions.",
    updatedDate: "October 2026",
    relatedSlugs: ["account-deletion", "api-key-security"],
    content: `
### User Data Rights
- **Data Export**: In **Settings -> Privacy & Security**, click **Export My Data** to download a complete JSON archive of your profile, preferences, and saved watchlist.
- **Search History**: Clear your entire search query log with a single click.
    `,
  },
  {
    slug: "account-deletion",
    title: "Account Deletion Workflow",
    category: "Privacy & Security",
    summary: "Permanent removal of your profile, credentials, saved watchlist, and sessions.",
    updatedDate: "October 2026",
    relatedSlugs: ["privacy-data-controls"],
    content: `
### Permanent Account Erasure
To permanently delete your account:
1. Navigate to **Settings -> Privacy & Security**.
2. Scroll to the **Danger Zone** and select **Delete Account**.
3. Confirm your password.
4. All associated sessions, preferences, encrypted credentials, and saved watchlists are permanently cascade-deleted from the database.
    `,
  },
  {
    slug: "troubleshooting-common-errors",
    title: "Troubleshooting Common Errors",
    category: "Troubleshooting",
    summary: "Resolving invalid API keys, network timeouts, empty search states, and playback blockages.",
    updatedDate: "October 2026",
    relatedSlugs: ["understanding-api-quotas", "connecting-youtube"],
    content: `
### Common Issues & Resolutions
- **Invalid API Key**: Double-check that there are no accidental spaces copied with your key.
- **Video Unavailable**: Some YouTube creators disable third-party iframe embeds. Click the external link button on the card to watch directly on YouTube.
- **Empty Search Results**: Try broadening your query or switching from Category Mode to Normal Mode.
    `,
  },
  {
    slug: "understanding-api-quotas",
    title: "Understanding API Quotas and Limitations",
    category: "Troubleshooting",
    summary: "Daily rate limits for YouTube Data API, TMDB restrictions, and fallback mechanics.",
    updatedDate: "October 2026",
    relatedSlugs: ["troubleshooting-common-errors", "connecting-youtube"],
    content: `
### Quota Specifications
- **YouTube Data API v3**: Google provides a free default quota of 10,000 units per day per project. A standard search request consumes 100 units.
- **TMDB API**: TMDB enforces rate limiting of approximately 40 requests per 10 seconds.
- **Automatic Fallback**: If your personal quota is exhausted, the platform automatically falls back to verified curated catalogs to ensure uninterrupted usage.
    `,
  },
];
