<script lang="ts">
	import { onMount } from 'svelte';
	import Bracket from '$lib/components/Bracket/Bracket.svelte';
	import Comparison from '$lib/components/Bracket/Comparison.svelte';
	import { BracketStore, MAX_ITEMS, parseItems } from '$lib/bracket/bracket';
	import {
		addPlayer,
		capturePicks,
		createSession,
		decodeSession,
		encodeSession,
		MAX_PLAYERS,
		mergeSessions,
		restoreBracket,
		type SharedBracket
	} from '$lib/bracket/share';

	let input = $state('');
	let randomize = $state(true);
	let bracket = $state<BracketStore | null>(null);
	let session = $state<SharedBracket | null>(null);
	let activeId = $state<string | null>(null);
	let revision = $state(0);
	let generation = $state(0);
	let error = $state('');
	let shareError = $state('');
	let notice = $state('');
	let joinName = $state('');
	let importLink = $state('');
	let shareLink = $state('');
	let encoding = $state(false);
	let loading = $state(false);
	let canShare = $state(false);
	let saveVersion = 0;
	let alive = true;
	let importVersion = 0;
	const player = $derived(session?.players.find((person) => person.id === activeId));
	const champion = $derived.by(() => {
		void revision;
		return bracket?.winner;
	});
	const labels = $derived(parseItems(input));
	const message = (cause: unknown) =>
		cause instanceof Error ? cause.message : 'Unable to open bracket.';

	function rememberIdentity(sessionId: string, playerId: string) {
		try {
			localStorage.setItem(`final-cut-player:${sessionId}`, playerId);
		} catch {
			/* Optional local identity only. */
		}
	}

	function useSession(next: SharedBracket, ownId: string | null) {
		session = next;
		encoding = false;
		importLink = '';
		activeId = ownId;
		const own = next.players.find((person) => person.id === ownId);
		bracket = own ? restoreBracket(next.movies, own.picks) : null;
		input = next.movies.join('\n');
		revision++;
		generation++;
		error = '';
		shareError = '';
	}

	async function saveUrl() {
		if (!session) return;
		const version = ++saveVersion;
		encoding = true;
		shareError = '';
		try {
			const hash = await encodeSession(session);
			if (!alive || version !== saveVersion) return;
			const url = window.location.origin + window.location.pathname + hash;
			window.history.replaceState(window.history.state, '', url);
			shareLink = url;
		} catch (cause) {
			if (alive && version === saveVersion) {
				shareError = message(cause);
				shareLink = '';
			}
		} finally {
			if (alive && version === saveVersion) encoding = false;
		}
	}

	onMount(() => {
		canShare = typeof navigator.share === 'function';
		async function openHash() {
			const version = ++importVersion;
			if (!window.location.hash) return;
			loading = true;
			++saveVersion;
			try {
				const next = await decodeSession(window.location.href);
				if (!alive || version !== importVersion) return;
				let ownId = null;
				try {
					ownId = localStorage.getItem(`final-cut-player:${next.id}`);
				} catch {
					/* Optional. */
				}
				useSession(next, ownId);
				shareLink = window.location.href;
			} catch (cause) {
				if (alive && version === importVersion) error = message(cause);
			} finally {
				if (alive && version === importVersion) loading = false;
			}
		}
		void openHash();
		window.addEventListener('hashchange', openHash);
		return () => {
			alive = false;
			++saveVersion;
			++importVersion;
			window.removeEventListener('hashchange', openHash);
		};
	});

	function generate(event: SubmitEvent) {
		event.preventDefault();
		try {
			++importVersion;
			loading = false;
			const next = createSession(new BracketStore(labels, randomize));
			rememberIdentity(next.id, next.players[0].id);
			useSession(next, next.players[0].id);
			notice = '';
			void saveUrl();
		} catch (cause) {
			error = message(cause);
		}
	}

	function choose(round: number, match: number, itemId: string) {
		if (!bracket || !session || !activeId) return;
		bracket.choose(round, match, itemId);
		session = {
			...session,
			players: session.players.map((person) =>
				person.id === activeId
					? { ...person, revision: person.revision + 1, picks: capturePicks(bracket!) }
					: person
			)
		};
		revision++;
		notice = '';
		void saveUrl();
	}

	function rename(name: string) {
		if (!session || !activeId || !name.trim()) return;
		session = {
			...session,
			players: session.players.map((person) =>
				person.id === activeId
					? { ...person, name: name.trim(), revision: person.revision + 1 }
					: person
			)
		};
		void saveUrl();
	}

	function join(event: SubmitEvent) {
		event.preventDefault();
		if (!session) return;
		try {
			const next = addPlayer(session, joinName);
			rememberIdentity(next.session.id, next.player.id);
			useSession(next.session, next.player.id);
			void saveUrl();
		} catch (cause) {
			shareError = message(cause);
		}
	}

	async function combine(event: SubmitEvent) {
		event.preventDefault();
		if (!session) return;
		try {
			const incoming = await decodeSession(importLink);
			if (!alive || !session) return;
			session = mergeSessions(session, incoming, activeId);
			importLink = '';
			notice = 'Results combined.';
			await saveUrl();
		} catch (cause) {
			shareError = message(cause);
		}
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(shareLink);
			notice = 'Link copied.';
		} catch {
			notice = 'Copy the link below.';
		}
	}

	async function nativeShare() {
		try {
			await navigator.share({ title: 'knox’s super cool bracket maker', url: shareLink });
		} catch (cause) {
			if (!(cause instanceof Error && cause.name === 'AbortError')) notice = 'Copy the link below.';
		}
	}
</script>

<svelte:head>
	<title>knox’s super cool bracket maker</title>
	<meta name="description" content="Create and share a bracket." />
</svelte:head>

<div class="workspace" class:playing={!!bracket}>
	<div class="intro"><h1>make a bracket</h1></div>
	<details class="entry-panel" open={!session}>
		<summary
			><span>{session ? 'Edit items' : 'Items'}</span><span class="item-count"
				>{labels.length} items <span aria-hidden="true">＋</span></span
			></summary
		>
		<form onsubmit={generate}>
			<label for="items">Items — one per line</label>
			<textarea
				id="items"
				bind:value={input}
				placeholder="Option A&#10;Option B&#10;Option C&#10;Option D"
				aria-describedby="items-help"
				required
			></textarea>
			<p id="items-help" class="help-text">
				2–{MAX_ITEMS} items.
			</p>
			<div class="form-bottom">
				<label class="checkbox-label"
					><input type="checkbox" bind:checked={randomize} /> Shuffle</label
				>
				<button type="submit" class="primary-button"
					>{session ? 'Generate new bracket' : 'Generate bracket'}
					<span aria-hidden="true">↗</span></button
				>
			</div>

			{#if session}<p class="help-text">Starts a new bracket for everyone.</p>{/if}
		</form>
	</details>
	{#if loading}<p role="status">Loading bracket…</p>{/if}
	{#if error}<p role="alert" class="error">{error}</p>{/if}
	{#if session}
		<details class="sharing" open={!player}>
			<summary
				><span>Share &amp; compare</span><span class="item-count"
					>{session.players.length}/{MAX_PLAYERS} people</span
				></summary
			>
			<div class="sharing-content">
				{#if player}
					<label class="name-label" for="player-name">Your name</label>
					<input
						id="player-name"
						class="text-input"
						value={player.name}
						maxlength="40"
						onchange={(event) => rename(event.currentTarget.value)}
					/>
				{:else if session.players.length < MAX_PLAYERS}
					<form onsubmit={join} class="inline-form join-form">
						<label class="name-label" for="join-name">Your name</label>
						<input
							id="join-name"
							class="text-input"
							bind:value={joinName}
							maxlength="40"
							required
						/>
						<button class="primary-button" type="submit">Make my picks</button>
					</form>
				{:else}<p class="help-text">This bracket already has four people.</p>{/if}
				<div class="share-actions">
					<button
						class="secondary-button"
						type="button"
						disabled={encoding || !shareLink}
						onclick={copyLink}>Copy link</button
					>
					{#if canShare}<button
							class="secondary-button"
							type="button"
							disabled={encoding || !shareLink}
							onclick={nativeShare}>Share</button
						>{/if}
				</div>
				<details class="link-details">
					<summary>Link & returned results</summary>
					<label class="name-label" for="share-link">Bracket link</label>
					<textarea
						id="share-link"
						class="link-input"
						readonly
						value={encoding ? 'Updating link…' : shareLink}
						onfocus={(event) => event.currentTarget.select()}
					></textarea>
					<form class="import-form" onsubmit={combine}>
						<label class="name-label" for="returned-link">Paste a friend's result link</label>
						<textarea id="returned-link" class="link-input" bind:value={importLink} required
						></textarea>
						<button class="secondary-button" type="submit">Combine results</button>
					</form>
				</details>
				<p class="help-text">
					Send your link. Friends make their picks and send a link back. Paste returned links to
					compare up to four people. Links are snapshots; send a new one after changes.
				</p>
				<p class="help-text">Results stay in the link and your browser. No server storage.</p>
				{#if notice}<p role="status" class="help-text">{notice}</p>{/if}
				{#if shareError}<p role="alert" class="error">{shareError}</p>{/if}
			</div>
		</details>
		{#if bracket}
			<section class="tournament" aria-label="Your tournament">
				<div class="tournament-title">
					<h2>Your picks</h2>
					<span class="item-count">{bracket.items.length} items</span>
				</div>
				<div aria-live="polite" class:champion={!!champion} class="tournament-status">
					{#if champion}<p>Champion: {champion.label}</p>{:else}<p>
							Tap an item to advance it.
						</p>{/if}
				</div>
				{#key generation}<Bracket {bracket} {revision} onchoose={choose} />{/key}
				<p class="help-text tournament-help">Changing a pick resets affected results.</p>
			</section>
		{/if}
		{#if session.players.length > 1 || !player}
			{#if player && champion}{#key session.id}<Comparison {session} />{/key}
			{:else}<section class="locked-results" aria-label="Locked results">
					<span class="lock-icon" aria-hidden="true">🔒</span>
					<h2>friends’ picks are locked</h2>
					<p>Finish your bracket to unlock the table and full brackets.</p>
				</section>{/if}
		{/if}
	{/if}
</div>
