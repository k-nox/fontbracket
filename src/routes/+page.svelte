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
	<title>Final Cut — Every movie. One favorite.</title>
	<meta
		name="description"
		content="Turn your watchlist into a movie tournament. Pick your favorites, one matchup at a time."
	/>
	<meta name="theme-color" content="#171719" />
</svelte:head>

<div class="workspace" class:playing={!!bracket}>
	<div class="intro">
		<p class="eyebrow">FOR THE LOVE OF FILM</p>
		<h1>{bracket ? 'The screening starts here.' : 'Every movie. One favorite.'}</h1>
		<p class="intro-copy">
			{bracket
				? 'Two films. One tough call. Tap your pick and let the best movie rise.'
				: 'Your cult classics, comfort rewatches, and five-star favorites. Put them head to head. Only one makes the final cut.'}
		</p>
	</div>
	<details class="entry-panel" open={!bracket}>
		<summary
			><span>{bracket ? 'Edit your movies' : 'Cast your contenders'}</span><span class="item-count"
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
				Enter 2–{MAX_ITEMS} movies. Blank lines are ignored; duplicate names are allowed.
			</p>
			<div class="form-bottom">
				<label class="checkbox-label"
					><input type="checkbox" bind:checked={randomize} /> Shuffle movies before pairing</label
				>
				<button type="submit" class="primary-button"
					>{bracket ? 'Generate new bracket' : 'Generate bracket'}
					<span aria-hidden="true">↗</span></button
				>
			</div>
			{#if error}<p role="alert" class="error">{error}</p>{/if}
			{#if bracket}<p class="help-text">A new bracket replaces your current results.</p>{/if}
		</form>
	</details>
	{#if bracket}
		<section class="tournament" aria-label="Your tournament">
			<div class="tournament-title">
				<h2>The tournament</h2>
				<span class="item-count">{bracket.items.length} contenders</span>
			</div>
			<div aria-live="polite" class:champion={!!champion} class="tournament-status">
				{#if champion}<span class="eyebrow">BEST PICTURE, ACCORDING TO YOU</span>
					<p>Champion: {champion.label}</p>{:else}<p>
						Choose winners to complete your bracket.
					</p>{/if}
			</div>
			{#key generation}<Bracket {bracket} {revision} onchoose={choose} />{/key}
			<p class="help-text tournament-help">
				Changed your mind? Pick again. Affected later results will reset. Byes advance
				automatically.
			</p>
		</section>
	{:else}<p class="opening-note">
			<span aria-hidden="true">✧</span> No critics. No scores. Just your favorites.
		</p>{/if}
</div>
