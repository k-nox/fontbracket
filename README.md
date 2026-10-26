# Item Bracket

A SvelteKit single-elimination tournament builder adapted from Font Bracket.

Paste 2–256 items, one per line, and generate the complete bracket immediately.
Blank lines are ignored; duplicate names and the literal name “BYE” are supported.
Shuffle is enabled by default; disable it to pair items in their supplied order.
Byes are allocated only in the opening round to fill the next power of two.
Click contestants to advance them. Changing an earlier winner clears affected
later results while preserving unrelated matches. Generating again replaces the
current tournament. Results live in memory and are lost on reload.

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
