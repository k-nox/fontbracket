<script lang="ts">
	import Bracket from '$lib/components/Bracket/Bracket.svelte';
	import { BracketStore, MAX_ITEMS, parseItems } from '$lib/bracket/bracket';

	let input = $state('');
	let randomize = $state(true);
	let bracket = $state<BracketStore | null>(null);
	let revision = $state(0);
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
	<title>Item Bracket — Build a tournament from your list</title>
	<meta
		name="description"
		content="Paste a list of items, generate a tournament bracket, and choose your winners."
	/>
</svelte:head>

<div class="mx-auto flex max-w-7xl flex-col gap-6">
	<div>
		<h1 class="h2">Make a bracket for anything</h1>
		<p>Enter your items, generate a bracket, and click the winner of each matchup.</p>
	</div>
	<form onsubmit={generate} class="flex max-w-xl flex-col gap-4">
		<label for="items" class="label">Items — one per line</label>
		<textarea
			id="items"
			class="textarea min-h-48"
			bind:value={input}
			placeholder="Pizza&#10;Tacos&#10;Sushi&#10;Pasta"
			aria-describedby="items-help"
			required
		></textarea>
		<p id="items-help" class="text-sm">
			{labels.length} items · Enter 2–{MAX_ITEMS} items. Blank lines are ignored; duplicate names are
			allowed.
		</p>
		<label class="flex items-center gap-2"
			><input type="checkbox" bind:checked={randomize} /> Shuffle items before pairing</label
		>
		{#if error}<p role="alert" class="text-error-500">{error}</p>{/if}
		<button type="submit" class="btn preset-filled-primary self-start"
			>{bracket ? 'Generate new bracket' : 'Generate bracket'}</button
		>
		{#if bracket}<p class="text-sm">Generating a new bracket replaces the current results.</p>{/if}
	</form>
	{#if bracket}
		<section class="space-y-4" aria-label="Your tournament">
			<h2 class="h3">Your bracket · {bracket.items.length} items</h2>
			<p>
				Click an item to advance it. You can change a choice; affected later results will be
				cleared. Byes advance automatically in the opening round.
			</p>
			<p aria-live="polite" class="text-success-500">
				{champion ? `Champion: ${champion.label}` : 'Choose winners to complete your bracket.'}
			</p>
			<Bracket {bracket} {revision} onchoose={choose} />
		</section>
	{/if}
</div>
