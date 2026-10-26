<script lang="ts">
	import Bracket from '$lib/components/Bracket/Bracket.svelte';
	import { BracketStore, MAX_ITEMS, parseItems } from '$lib/bracket/bracket';

	let input = $state('');
	let randomize = $state(true);
	let bracket = $state<BracketStore | null>(null);
	let revision = $state(0);
	let generation = $state(0);
	let error = $state('');
	const champion = $derived.by(() => {
		void revision;
		return bracket?.winner;
	});
	const labels = $derived(parseItems(input));

	function generate(event: SubmitEvent) {
		event.preventDefault();
		try {
			bracket = new BracketStore(labels, randomize);
			error = '';
			revision++;
			generation++;
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Unable to generate bracket.';
		}
	}

	function choose(round: number, match: number, itemId: string) {
		bracket?.choose(round, match, itemId);
		revision++;
	}
</script>

<svelte:head>
	<title>Final Cut</title>
	<meta name="description" content="Create a movie bracket." />
	<meta name="theme-color" content="#171719" />
</svelte:head>

<div class="workspace" class:playing={!!bracket}>
	<div class="intro"><h1>Movie bracket</h1></div>
	<details class="entry-panel" open={!bracket}>
		<summary
			><span>{bracket ? 'Edit movies' : 'Movies'}</span><span class="item-count"
				>{labels.length} films <span aria-hidden="true">＋</span></span
			></summary
		>
		<form onsubmit={generate}>
			<label for="items">Movies — one per line</label>
			<textarea
				id="items"
				bind:value={input}
				placeholder="The Grand Budapest Hotel&#10;Spirited Away&#10;Before Sunrise&#10;The Truman Show"
				aria-describedby="items-help"
				required
			></textarea>
			<p id="items-help" class="help-text">
				2–{MAX_ITEMS} movies.
			</p>
			<div class="form-bottom">
				<label class="checkbox-label"
					><input type="checkbox" bind:checked={randomize} /> Shuffle</label
				>
				<button type="submit" class="primary-button"
					>{bracket ? 'Generate new bracket' : 'Generate bracket'}
					<span aria-hidden="true">↗</span></button
				>
			</div>
			{#if error}<p role="alert" class="error">{error}</p>{/if}
			{#if bracket}<p class="help-text">Replaces current results.</p>{/if}
		</form>
	</details>
	{#if bracket}
		<section class="tournament" aria-label="Your tournament">
			<div class="tournament-title">
				<h2>Bracket</h2>
				<span class="item-count">{bracket.items.length} movies</span>
			</div>
			<div aria-live="polite" class:champion={!!champion} class="tournament-status">
				{#if champion}
					<p>Champion: {champion.label}</p>{:else}<p>Tap a movie to advance it.</p>{/if}
			</div>
			{#key generation}<Bracket {bracket} {revision} onchoose={choose} />{/key}
			<p class="help-text tournament-help">Changing a pick resets affected results.</p>
		</section>
	{/if}
</div>
