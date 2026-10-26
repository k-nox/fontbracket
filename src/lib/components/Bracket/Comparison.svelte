<script lang="ts">
	import { agreement, restoreBracket, type SharedBracket } from '$lib/bracket/share';
	let { session }: { session: SharedBracket } = $props();
	let round = $state(0);
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
</section>
