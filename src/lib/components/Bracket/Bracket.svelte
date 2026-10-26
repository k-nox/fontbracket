<script lang="ts">
	import type { BracketStore } from '$lib/bracket/bracket';

	interface Props {
		bracket: BracketStore;
		revision: number;
		onchoose: (round: number, match: number, itemId: string) => void;
	}
	let { bracket, onchoose, revision }: Props = $props();
	const rounds = $derived.by(() => {
		void revision;
		return bracket.rounds.map((matches) => matches.map((match) => ({ ...match })));
	});
</script>

<section aria-label="Tournament bracket" class="overflow-x-auto pb-4">
	<div class="flex min-w-max gap-6">
		{#each rounds as matches, round (round)}
			<section class="flex w-60 flex-col gap-4" aria-label={`Round ${round + 1}`}>
				<h3 class="h4">{round === bracket.rounds.length - 1 ? 'Final' : `Round ${round + 1}`}</h3>
				<div class="flex grow flex-col justify-around gap-4">
					{#each matches as match, index (match.id)}
						<div
							class="border-surface-500 overflow-hidden rounded-lg border"
							role="group"
							aria-label={`Round ${round + 1}, match ${index + 1}`}
						>
							{#each match.sides as item, side (side)}
								<button
									type="button"
									class="block min-h-12 w-full px-4 py-3 text-left break-words disabled:cursor-default {side ===
									1
										? 'border-surface-500 border-t'
										: ''} {item && match.winner?.id === item.id
										? 'preset-tonal-success font-bold'
										: 'enabled:hover:preset-tonal-primary'}"
									disabled={!match.sides[0] || !match.sides[1]}
									aria-pressed={!!item && match.winner?.id === item.id}
									onclick={() => item && onchoose(round, index, item.id)}
								>
									{item?.label ?? (round === 0 ? 'Bye' : 'TBD')}
									{#if item && match.winner?.id === item.id}<span aria-label="Winner"> ✓</span>{/if}
								</button>
							{/each}
						</div>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</section>
