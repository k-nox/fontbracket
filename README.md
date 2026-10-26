# knox’s super cool bracket maker

A mobile-friendly SvelteKit single-elimination tournament builder adapted from Font Bracket.

Paste 2–256 items, one per line, and generate the complete bracket immediately.
Blank lines are ignored; duplicate names and the literal name “BYE” are supported.
Shuffle is enabled by default; disable it to pair items in their supplied order.
Byes are allocated only in the opening round to fill the next power of two.
Click contestants to advance them. Changing an earlier winner clears affected
later results while preserving unrelated matches. Generating again replaces the
current tournament. Picks are saved in the URL fragment after every change; keep the link to reopen them.

The mobile layout shows one round at a time, with previous/next controls and an optional full-bracket overview. The input panel collapses after generation. A header switch toggles playful light and dark palettes, defaults to the system preference, and remembers the choice in browser storage when available.

Labels are rendered as text, never HTML. The tournament engine in
`src/lib/bracket/bracket.ts` has no font or UI dependencies.

## Development

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm test -- --run
pnpm build
```

## Sharing and comparison

Open **Share & compare**, set your name, and copy/share the link. A friend opens
it, enters their name, and makes independent picks on the identical item order.
They return their updated link. Paste it under **Link & returned results** to
combine results. Up to four people can compare champions and round-by-round
picks; agreement counts only matches both people decided, excluding automatic byes.

Links are snapshots, not live rooms. Later edits require a new returned link.
Participant revisions keep older returned copies from overwriting newer results;
imports never overwrite your own picks, and incompatible brackets are rejected.

All bracket data is compressed and encoded into `#b=…` in the URL. Fragments are
not sent to the hosting server. There are no data APIs, database, analytics,
accounts, or server-side bracket storage. Only the theme preference and the
local participant ID are kept in localStorage; results travel in the link. If
localStorage is unavailable, sharing still works but reopening a link may require
joining again. Links can be inspected or edited by anyone who has them.

The URL format is versioned and bounded, validates winners against their actual
matchups, preserves duplicate labels, and supports an uncompressed fallback for
browsers without CompressionStream. Links above 60,000 characters and item names
over 500 characters are rejected. Very large links may exceed a messaging app's
own limits; use fewer or shorter item names. Compressed links require a browser
with DecompressionStream support.

## Appearance and spoilers

The interface uses a pickle logo, a lowercase name, and Comic Sans where installed.
A bundled OFL-licensed Comic Neue fallback keeps the comic style on other devices
without third-party font requests (license: `static/fonts/OFL.txt`).

Friends’ champions, agreements, tables, and graphic brackets are not rendered
until your own bracket is complete. Changing a pick that clears the final locks
results again. Unjoined visitors cannot view group results, including full groups.
This is a browser-side spoiler lock, not cryptographic access control: the URL
contains all participant snapshots and can be decoded outside the app.

Once unlocked, switch between the table and a read-only full-bracket diagram for
any participant. Diagrams show match connections and highlight the champion’s
path, with zoom and scrolling for larger brackets.

## Toolchain

Use Node.js 24 or newer and pnpm 10.8. The app uses SvelteKit 3, Vite 8, Vitest 5, ESLint 10, and TypeScript 6. TypeScript 6 is the newest version supported by SvelteKit and typescript-eslint; Node types follow the Node 24 runtime. SvelteKit configuration now lives in `vite.config.ts`, and library imports use the `#lib` package subpath. The 54 unused font packages and seven legacy font-comparison libraries were removed; the bundled comic-font fallback is unchanged.
