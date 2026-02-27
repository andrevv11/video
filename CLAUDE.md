# CLAUDE.md

This file provides guidance for AI assistants working in this repository.

## Project Overview

A **mobile-first portrait video gallery** SPA for displaying iPhone travel footage. Designed for 9:16 aspect-ratio videos with smooth slide transitions, swipe/tap/keyboard navigation, and auto-advance on video end.

**Stack:** TypeScript, Bun runtime, vanilla HTML/CSS — no frameworks, no runtime dependencies.

---

## Repository Structure

```
/
├── src/                    # TypeScript source (bundled to public/bundle.js)
│   ├── main.ts             # Entry point: playlist config + event listener setup
│   ├── gallery.ts          # Core Gallery class: state, transitions, preloading
│   ├── player.ts           # VideoPlayer wrapper around HTMLVideoElement
│   └── types.ts            # Shared interfaces: Video, PanelId, GalleryState
├── public/                 # Static assets served directly
│   ├── index.html          # Shell HTML; two-panel slot system
│   ├── style.css           # Mobile-first styles; portrait/landscape variants
│   ├── bundle.js           # Generated build artifact (gitignored)
│   └── videos/             # Video files (MP4/MOV); README explains adding videos
│       └── README.md
├── scripts/
│   └── serve.ts            # Dev server: port 3000, range requests, SPA routing
├── .github/workflows/
│   └── deploy.yml          # CI/CD: build + deploy to GitHub Pages on push to main
├── package.json            # Scripts and devDependencies
├── tsconfig.json           # Strict TypeScript config (ES2020, exactOptionalPropertyTypes)
└── bun.lock                # Lockfile (only devDep: @types/bun)
```

---

## Development Workflow

### Prerequisites

Bun runtime is required. No other installs needed.

### Commands

```bash
bun install          # Install devDependencies (just @types/bun)
bun run dev          # Watch-mode TypeScript bundling → public/bundle.js
bun run serve        # Dev server at http://localhost:3000
bun run start        # Both dev + serve in parallel (recommended)
bun run build        # Production build with minification
```

### Adding Videos

1. Copy video file into `public/videos/`
2. Add an entry to the `VIDEOS` array in `src/main.ts`:
   ```ts
   { url: 'videos/my-clip.mov', title: 'Optional title' }
   ```
3. Files >25 MB should use Git LFS (see `public/videos/README.md`)

---

## Architecture

### Two-Panel Sliding System

The gallery maintains two DOM panels (`#video-a` and `#video-b`, typed as `PanelId = 'a' | 'b'`). During navigation:

1. The inactive panel pre-loads the target video off-screen (`translateX(±100%)`)
2. CSS transition (420 ms, `cubic-bezier`) slides panels in/out simultaneously
3. `onTransitionEnd` swaps the active panel and preloads the next upcoming video
4. A fallback timeout guards against tab backgrounding preventing `transitionend`

### State

All mutable state is in a `GalleryState` object (defined in `types.ts`):

```ts
interface GalleryState {
  playlist: Video[];
  currentIndex: number;
  activePanel: PanelId;
  isSliding: boolean;
  isMuted: boolean;
}
```

The `Gallery` class is the single owner; `VideoPlayer` wraps only the `<video>` element API.

### Input Unification

Three input methods all map to `gallery.goNext()` / `gallery.goPrev()`:
- **Tap zones** — left 40% / right 40% of screen
- **Swipe** — 50 px minimum, 1.2× axis dominance ratio to filter vertical scrolls
- **Keyboard** — `ArrowRight`/`ArrowDown` → next; `ArrowLeft`/`ArrowUp` → prev

### Playlist Shuffle

When the user reaches the end (or start) of the playlist, it is shuffled with Fisher-Yates before wrapping. This prevents the same order from repeating.

---

## Key Conventions

### TypeScript

- Strict mode enabled: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `exactOptionalPropertyTypes`
- Module bundler resolution (`"moduleResolution": "bundler"`)
- Target ES2020; modern browser APIs used directly (no polyfills)

### Naming

| Construct | Convention | Example |
|-----------|------------|---------|
| Classes | PascalCase | `Gallery`, `VideoPlayer` |
| Methods / variables | camelCase | `goNext()`, `activePanel` |
| Constants | SCREAMING_SNAKE_CASE | `VIDEOS`, `SLIDE_DURATION`, `SWIPE_MIN_PX` |
| DOM IDs | kebab-case | `tap-left`, `video-a`, `loading-overlay` |
| CSS classes | kebab-case | `.slide-container`, `.mute-btn` |

### Code Style

- Class-based architecture for stateful components
- Promise-based async for transitions
- ASCII section dividers (`// ── Label ──`) separate logical blocks within files
- Comments only where logic is non-obvious; no redundant JSDoc
- No external runtime libraries — use Web APIs and Bun built-ins only

### CSS

- `100dvh` for full-screen (dynamic viewport, avoids iOS browser chrome)
- `touch-action: none` on slide container (blocks pull-to-refresh)
- `object-fit: cover` for portrait videos; switches to `contain` in landscape media query
- Safe-area insets (`env(safe-area-inset-*)`) for notched devices
- Glassmorphic mute button: `backdrop-filter: blur`

---

## Build & CI/CD

- **Build output:** `public/bundle.js` (gitignored — regenerated on each build)
- **CI trigger:** push to `main` or manual workflow dispatch
- **Pipeline steps:** checkout (LFS) → setup Bun → `bun install --frozen-lockfile` → `bun run build` → upload `public/` as GitHub Pages artifact
- **Deployment target:** GitHub Pages

---

## Git Workflow

Multiple sessions may work on `main` concurrently. If a push to `main` is rejected due to conflicts:

1. Rebase on the latest remote `main` and try again:
   ```bash
   git fetch origin main
   git rebase origin/main
   git push -u origin main
   ```
2. Resolve any rebase conflicts, then `git rebase --continue` before pushing.
3. Do **not** force-push unless you have confirmed no other session's work will be lost.

---

## No Tests

There is currently no test framework. When adding tests, use **Bun's built-in test runner** (`bun test`) and add a `"test"` script to `package.json`. Place test files alongside source as `*.test.ts`.

---

## Important Notes for AI Assistants

- `public/bundle.js` is a **generated file** — never edit it directly; edit `src/` files
- The dev server (`scripts/serve.ts`) includes a directory traversal guard — don't weaken it
- Video assets can be large; prefer Git LFS for files over 25 MB
- The project has zero runtime npm dependencies — do not add any without strong justification
- TypeScript `exactOptionalPropertyTypes` is enabled — be precise with optional property assignments
- The two-panel system depends on exactly two panels in the DOM; don't add a third
