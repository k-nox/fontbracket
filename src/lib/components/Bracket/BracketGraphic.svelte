<script lang="ts">
	import type { BracketStore } from '$lib/bracket/bracket';
	let { bracket, name }: { bracket: BracketStore; name: string } = $props();
	let zoom = $state(1);
	const column = 256;
	const nodeWidth = 208;
	const nodeHeight = 104;
	const step = 136;
	const width = $derived((bracket.rounds.length + 1) * column + 24);
	const height = $derived(Math.max(260, bracket.rounds[0].length * step + 108));
	const scale = $derived(zoom === 0 ? Math.min(1, 560 / height) : zoom);
	const center = (round: number, match: number) => 54 + 2 ** round * (match + 0.5) * step;
	const x = (round: number) => 18 + round * column;
</script>

<div class="graph-controls">
	<label
		>Zoom <select bind:value={zoom}
			><option value={1}>100%</option><option value={0.75}>75%</option><option value={0.5}
				>50%</option
			><option value={0.25}>25%</option><option value={0}>Fit height</option></select
		></label
	>
	<span class="help-text">Scroll to explore.</span>
</div>
<div class="graph-scroll">
	<svg
		width={width * scale}
		height={height * scale}
		viewBox={`0 0 ${width} ${height}`}
		role="img"
		aria-label={`${name}'s full bracket`}
		class="bracket-graphic"
	>
		<title>{name}'s full bracket</title>
		{#each bracket.rounds as matches, round (round)}
			<text class="graph-heading" x={x(round)} y="25"
				>{round === bracket.rounds.length - 1 ? 'Final' : `Round ${round + 1}`}</text
			>
			{#each matches as match, index (match.id)}
				{@const y = center(round, index) - nodeHeight / 2}
				{@const target =
					round < bracket.rounds.length - 1
						? center(round + 1, Math.floor(index / 2))
						: center(round, index)}
				<path
					class="graph-connector"
					class:champion-path={!!match.winner && match.winner.id === bracket.winner?.id}
					d={`M ${x(round) + nodeWidth} ${center(round, index)} H ${x(round) + nodeWidth + 24} V ${target} H ${x(round + 1)}`}
				/>
				<g
					><title
						>{match.sides.map((item) => item?.label ?? (round === 0 ? 'Bye' : 'TBD')).join(' / ')};
						winner: {match.winner?.label ?? 'undecided'}</title
					>
					<rect class="graph-node" x={x(round)} {y} width={nodeWidth} height={nodeHeight} rx="12" />
					<foreignObject x={x(round)} {y} width={nodeWidth} height={nodeHeight}>
						<div class="graph-card">
							{#each match.sides as item, side (side)}
								<div class="graph-side" class:graph-winner={!!item && match.winner?.id === item.id}>
									<span title={item?.label}>{item?.label ?? (round === 0 ? 'Bye' : 'TBD')}</span
									>{#if item && match.winner?.id === item.id}<b aria-label="Winner">✓</b>{/if}
								</div>
							{/each}
						</div>
					</foreignObject>
				</g>
			{/each}
		{/each}
		<text class="graph-heading" x={x(bracket.rounds.length)} y="25">Winner</text>
		<foreignObject
			x={x(bracket.rounds.length)}
			y={center(bracket.rounds.length - 1, 0) - 36}
			width={nodeWidth}
			height="80"
			><div class="graph-champion">
				<span aria-hidden="true">🏆</span><span>{bracket.winner?.label ?? 'Not finished'}</span>
			</div></foreignObject
		>
	</svg>
</div>
