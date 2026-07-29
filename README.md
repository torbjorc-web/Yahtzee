# Yacht Royale

A Yahtzee-inspired dice game built with React + TypeScript + Vite.

## Features

- Local multiplayer (pass-and-play)
- You vs AI (Casual, Smart, Ruthless)
- Online realtime 2-6 player rooms
  - Create/Join by room code
  - Host chooses room size from 2 to 6
  - Synced dice, scorecard, turn order
  - Turn locking (only active player can act)
  - Presence heartbeat + reconnect via saved room session
  - Lobby phase before host starts the game
- Match history with JSON import/export
- Automated rules and AI tests

## One-Command Run

```bash
npm run game
```

This starts the dev server and opens the app in your browser.

## One-Command Verify

```bash
npm run verify
```

This runs tests and then production build.

## Online Multiplayer Setup (Firebase)

1. Create a Firebase project.
2. Enable Firestore Database.
3. Create a local `.env` file from `.env.example`.
4. Fill values from Firebase project settings:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

1. Start app:

```bash
npm run game
```

## Minimal Firestore Rules (for prototype)

Use restrictive rules before public release. This prototype rule is suitable for testing only:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomCode} {
      allow read, write: if true;
    }
  }
}
```

## Scripts

- `npm run game` - Start app and open browser
- `npm run dev` - Start Vite dev server
- `npm run test` - Run Vitest suite
- `npm run test:watch` - Run tests in watch mode
- `npm run build` - Type-check and production build
- `npm run verify` - Tests + build
- `npm run preview` - Preview production build
