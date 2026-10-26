<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	let light = $state(false);
	onMount(() => {
		light = document.documentElement.dataset.appearance === 'light';
	});
	function toggleAppearance() {
		light = !light;
		const mode = light ? 'light' : 'dark';
		document.documentElement.dataset.appearance = mode;
		try {
			localStorage.setItem('item-bracket-appearance', mode);
		} catch {
			/* Storage is optional. */
		}
	}
	let { children } = $props();
</script>

<svelte:head>
	<meta name="theme-color" content={light ? '#f5f0ff' : '#241a35'} />
	<script>
		(() => {
			let mode;
			try {
				mode = localStorage.getItem('item-bracket-appearance');
			} catch {}
			if (mode !== 'light' && mode !== 'dark')
				mode = window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
			document.documentElement.dataset.appearance = mode;
		})();
	</script>
</svelte:head>

<div class="app-shell">
	<header class="site-header">
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- Compatible with pinned SvelteKit 2.20. -->
		<a href="/" class="brand"
			><span class="brand-icon" aria-hidden="true">🥒</span><span class="brand-name"
				>knox’s super cool bracket maker</span
			></a
		>
		<div class="header-actions">
			<button
				class="appearance-button"
				type="button"
				aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
				onclick={toggleAppearance}
				><span aria-hidden="true">{light ? '☾' : '☼'}</span><span>{light ? 'Dark' : 'Light'}</span
				></button
			>
			<a
				href="https://github.com/k-nox/fontbracket"
				class="source-link"
				aria-label="View source on GitHub">GitHub ↗</a
			>
		</div>
	</header>
	<main>{@render children()}</main>
</div>
