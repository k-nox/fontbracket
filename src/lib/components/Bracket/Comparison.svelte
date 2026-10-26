<script lang="ts">
	import BracketGraphic from './BracketGraphic.svelte';
	import { agreement, restoreBracket, type SharedBracket } from '#lib/bracket/share.ts';
	let { session }: { session: SharedBracket } = $props();
	let round = $state(0);
	let view = $state<'table' | 'brackets'>('table');
	let person = $state(0);
	const brackets = $derived(
		session.players.map((player) => restoreBracket(session.movies, player.picks))
	);
	const pairs = $derived(
		session.players.flatMap((a, index) =>
			session.players.slice(index + 1).map((b) => ({ a, b, ...agreement(session, a, b) }))
		)
	);
</script>

<section class="comparison" aria-label="Compare picks">
	<h2>Compare</h2>
	<div class="champion-grid">
		{#each session.players as player, index (player.id)}
			<div class="person-card">
				<p>{player.name}</p>
				<strong>{brackets[index].winner?.label ?? 'Not finished'}</strong>
			</div>
		{/each}
	</div>
	{#if pairs.length}
		<div class="agreements">
			{#each pairs as pair (`${pair.a.id}-${pair.b.id}`)}
				<p>
					{pair.a.name} / {pair.b.name}:
					<strong
						>{pair.total ? `${pair.same}/${pair.total} picks match` : 'No shared picks yet'}</strong
					>
				</p>
			{/each}
		</div>
	{/if}
	<div class="compare-views" role="group" aria-label="Comparison view">
		<button
			type="button"
			class="secondary-button"
			aria-pressed={view === 'table'}
			onclick={() => (view = 'table')}>Table</button
		>
		<button
			type="button"
			class="secondary-button"
			aria-pressed={view === 'brackets'}
			onclick={() => (view = 'brackets')}>Brackets</button
		>
	</div>
	{#if view === 'brackets'}
		<label class="compare-round"
			>Whose bracket <select bind:value={person}
				>{#each session.players as player, index (player.id)}<option value={index}
						>{player.name}</option
					>{/each}</select
			></label
		>
		{#key session.players[person].id}<BracketGraphic
				bracket={brackets[person]}
				name={session.players[person].name}
			/>{/key}
	{:else}
		<label class="compare-round"
			>Round
			<select bind:value={round}>
				{#each brackets[0].rounds as matches, index (index)}<option
						title={`${matches.length} matches`}
						value={index}
						>{index === brackets[0].rounds.length - 1 ? 'Final' : `Round ${index + 1}`}</option
					>{/each}
			</select>
		</label>
		<div class="comparison-scroll">
			<table>
				<caption class="sr-only">Picks by person for round {round + 1}</caption>
				<thead
					><tr
						><th scope="col">Match</th>{#each session.players as player (player.id)}<th scope="col"
								>{player.name}</th
							>{/each}</tr
					></thead
				>
				<tbody>
					{#each brackets[0].rounds[round] as match, index (match.id)}
						<tr
							><th scope="row">{index + 1}</th
							>{#each brackets as bracket, playerIndex (session.players[playerIndex].id)}<td
									>{bracket.rounds[round][index].winner?.label ?? '—'}</td
								>{/each}</tr
						>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
