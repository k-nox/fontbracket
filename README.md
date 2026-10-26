# Final Cut

A mobile-friendly SvelteKit single-elimination tournament builder adapted from Font Bracket.

Paste 2–256 movies (or any other items), one per line, and generate the complete bracket immediately.
Blank lines are ignored; duplicate names and the literal name “BYE” are supported.
Shuffle is enabled by default; disable it to pair items in their supplied order.
Byes are allocated only in the opening round to fill the next power of two.
Click contestants to advance them. Changing an earlier winner clears affected
later results while preserving unrelated matches. Generating again replaces the
current tournament. Picks are saved in the URL fragment after every change; keep the link to reopen them.

The mobile layout shows one round at a time, with previous/next controls and an optional full-bracket overview. The input panel collapses after generation. A header switch toggles Rosé Pine-inspired light and dark palettes, defaults to the system preference, and remembers the choice in browser storage when available.

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
it, enters their name, and makes independent picks on the identical movie order.
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
browsers without CompressionStream. Links above 60,000 characters and movie names
over 500 characters are rejected. Very large links may exceed a messaging app's
own limits; use fewer or shorter movie names. Compressed links require a browser
with DecompressionStream support.
