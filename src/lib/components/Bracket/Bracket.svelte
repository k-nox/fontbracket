<script lang="ts">
	import type { BracketStore } from '#lib/bracket/bracket.ts';

	interface Props {
		bracket: BracketStore;
		revision: number;
		onchoose: (round: number, match: number, itemId: string) => void;
	}
	let { bracket, onchoose, revision }: Props = $props();
	let selected = $state(0);
	let overview = $state(false);
	const rounds = $derived.by(() => {
		void revision;
		return bracket.rounds.map((matches) => matches.map((match) => ({ ...match })));
	});
	const current = $derived(rounds[selected]);
	const complete = $derived(current.every((match) => match.winner));
	const completed = $derived(current.filter((match) => match.winner).length);
	const roundName = (round: number) =>
		round === rounds.length - 1 ? 'Final' : `Round ${round + 1}`;
</script>

<section aria-label="Tournament bracket" class="bracket">
	<div class="bracket-toolbar">
		<p class="eyebrow">Matchups</p>
		<button
			type="button"
			class="text-button"
			aria-pressed={overview}
			onclick={() => (overview = !overview)}
		>
			{overview ? 'Round view' : 'View full bracket'}
		</button>
	</div>
	{#if !overview}
		<nav class="round-tabs" aria-label="Choose a round">
			{#each rounds as matches, round (round)}
				<button
					type="button"
					class:active={selected === round}
					aria-pressed={selected === round}
					onclick={() => (selected = round)}
				>
					{roundName(round)}
					<span>{matches.filter((match) => match.winner).length}/{matches.length}</span>
				</button>
			{/each}
		</nav>
		<div class="round-heading">
			<div>
				<h3>{roundName(selected)}</h3>
				<p>{completed} of {current.length} matchups decided</p>
			</div>
			<span class="round-counter">{selected + 1} / {rounds.length}</span>
		</div>
	{/if}
	<div class:overview class="rounds">
		{#each rounds as matches, round (round)}
			{#if overview || selected === round}
				<section class="round" aria-label={`Round ${round + 1}`}>
					{#if overview}<h3>{roundName(round)}</h3>{/if}
					<div class="match-list">
						{#each matches as match, index (match.id)}
							<div class="match" role="group" aria-label={`Round ${round + 1}, match ${index + 1}`}>
								<div class="match-label">
									<span>Match {index + 1}</span><span
										>{match.winner
											? round === 0 && !match.sides[1]
												? 'Auto-advance'
												: 'Decided'
											: 'Pick a winner'}</span
									>
								</div>
								{#each match.sides as item, side (side)}
									<button
										type="button"
										class="contestant"
										class:winner={!!item && match.winner?.id === item.id}
										disabled={!match.sides[0] || !match.sides[1]}
										aria-pressed={!!item && match.winner?.id === item.id}
										onclick={() => item && onchoose(round, index, item.id)}
									>
										<span class="slot-number" aria-hidden="true">{side + 1}</span>
										<span class="item-label"
											>{item?.label ?? (round === 0 ? 'Bye' : 'Waiting for winner')}</span
										>
										{#if item && match.winner?.id === item.id}<span
												class="winner-mark"
												aria-label="Winner">✓</span
											>{/if}
									</button>
								{/each}
							</div>
						{/each}
					</div>
				</section>
			{/if}
		{/each}
	</div>
	{#if !overview}
		<div class="round-navigation">
			<button
				type="button"
				class="secondary-button"
				disabled={selected === 0}
				onclick={() => selected--}>← Previous</button
			>
			{#if selected < rounds.length - 1}
				<button
					type="button"
					class:ready={complete}
					class="secondary-button"
					onclick={() => selected++}>{complete ? 'Continue' : 'Next round'} →</button
				>
			{/if}
		</div>
	{/if}
</section>
