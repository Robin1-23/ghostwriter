# Ghost — AI Ghostwriter

Replies in your voice. Drafts for Gmail, WhatsApp, Slack, and X in seconds.

---

## What's built

- **Landing page** — hero, demo, features, social proof, Google sign-in CTA
- **Auth** — Google OAuth via Firebase Auth, protected routes
- **Draft panel** — paste a message, pick platform + tone, get 3 AI variants (A/B/C), shorten, regenerate, copy
- **Voice panel** — paste your own writing samples, AI extracts your tone fingerprint, saved to Firestore
- **History panel** — all drafts saved in real-time to Firestore, searchable, reloadable
- **Settings panel** — toggle preferences, integrations roadmap, danger zone

---

## Tech stack

| Layer | Tool |
|---|---|
| Frontend | React 18 + CSS Modules |
| Auth | Firebase Auth (Google OAuth) |
| Database | Firebase Firestore |
| AI | Claude claude-sonnet-4-6 via Anthropic API |
| Routing | React Router v6 |
| Hosting | Vercel (recommended) |

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd ghost-app
npm install
```

### 2. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (e.g. `ghost-app`)
3. Enable **Authentication** → Sign-in method → **Google**
4. Enable **Firestore Database** → Start in production mode
5. Go to **Project Settings** → Your apps → Add web app → copy the config

### 3. Set environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your Firebase config values.

### 4. Apply Firestore security rules

In the Firebase Console → Firestore → Rules, paste the contents of `firestore.rules`.

### 5. Run locally

```bash
npm start
```

App runs at `http://localhost:3000`.

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Set the same environment variables in Vercel Dashboard → Project → Settings → Environment Variables.

That's it — Vercel auto-detects Create React App and handles the build.

---

## Project structure

```
src/
├── App.js                  # Router + auth guards
├── index.js / index.css    # Entry point + global styles
├── contexts/
│   └── AuthContext.js      # Firebase auth state
├── hooks/
│   └── useFirestore.js     # Voice profile + draft history hooks
├── lib/
│   ├── firebase.js         # Firebase init
│   └── api.js              # All Anthropic API calls
├── pages/
│   ├── Landing.js/.css     # Public landing page
│   └── AppShell.js/.css    # Main app layout + sidebar
└── components/
    ├── DraftPanel.js/.css  # Core drafting UI
    ├── VoicePanel.js/.css  # Voice training
    ├── HistoryPanel.js/.css# Draft history
    └── SettingsPanel.js/.css
```

---

## Roadmap (post-MVP)

- [ ] Chrome extension — "Ghost reply" button in Gmail + Slack
- [ ] Paywall — free 10/day, Pro unlimited (Stripe)
- [ ] Platform-specific voice profiles
- [ ] WhatsApp Web injection
- [ ] X/Twitter reply thread context
- [ ] Mobile app (React Native)
- [ ] Team workspaces

---

## Notes

- The Anthropic API key is handled by the claude.ai artifact proxy. For production, route calls through your own backend to keep the key secret.
- Firestore security rules ensure users can only access their own data.
- Voice profiles store only extracted traits (tags + scores), never raw message text.
