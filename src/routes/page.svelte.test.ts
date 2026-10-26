import { afterEach, beforeEach, describe, test, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import {
	addPlayer,
	capturePicks,
	createSession,
	decodeSession,
	encodeSession
} from '#lib/bracket/share.ts';
import { BracketStore } from '#lib/bracket/bracket.ts';
import Page from './+page.svelte';

beforeEach(() => {
	window.history.replaceState({}, '', '/');
	localStorage.clear();
	vi.stubGlobal('CompressionStream', undefined);
});
afterEach(() => {
	cleanup();
	window.history.replaceState({}, '', '/');
	vi.unstubAllGlobals();
});

describe('/+page.svelte', () => {
	test('generates a full bracket and selects a champion safely', async () => {
		render(Page);
		await fireEvent.input(screen.getByLabelText('Items — one per line'), {
			target: { value: '<img src=x onerror=alert(1)>\nBYE' }
		});
		await fireEvent.click(screen.getByLabelText('Shuffle'));
		await fireEvent.click(screen.getByRole('button', { name: 'Generate bracket' }));
		expect(screen.getByRole('region', { name: 'Tournament bracket' })).toBeInTheDocument();
		expect(document.querySelector('img')).toBeNull();
		await fireEvent.click(screen.getByRole('button', { name: 'BYE' }));
		expect(screen.getByText('Champion: BYE')).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: '<img src=x onerror=alert(1)>' }));
		expect(screen.getByText('Champion: <img src=x onerror=alert(1)>')).toBeInTheDocument();
	});

	test('explains invalid item counts', async () => {
		render(Page);
		await fireEvent.input(screen.getByLabelText('Items — one per line'), {
			target: { value: 'Only one' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Generate bracket' }));
		expect(screen.getByRole('alert')).toHaveTextContent('Enter between 2 and 256');
	});
});

test('uses one round at a time and allows browsing the complete bracket', async () => {
	render(Page);
	await fireEvent.input(screen.getByLabelText('Items — one per line'), {
		target: { value: 'A\nB\nC\nD' }
	});
	await fireEvent.click(screen.getByLabelText('Shuffle'));
	await fireEvent.click(screen.getByRole('button', { name: 'Generate bracket' }));
	expect(screen.getByRole('region', { name: 'Round 1' })).toBeInTheDocument();
	expect(screen.queryByRole('region', { name: 'Round 2' })).not.toBeInTheDocument();
	await fireEvent.click(screen.getByRole('button', { name: 'A' }));
	await fireEvent.click(screen.getByRole('button', { name: 'C' }));
	await fireEvent.click(screen.getByRole('button', { name: 'Continue →' }));
	expect(screen.queryByRole('region', { name: 'Round 1' })).not.toBeInTheDocument();
	await fireEvent.click(screen.getByRole('button', { name: 'C' }));
	expect(screen.getByText('Champion: C')).toBeInTheDocument();
	await fireEvent.click(screen.getByRole('button', { name: 'View full bracket' }));
	expect(screen.getByRole('region', { name: 'Round 1' })).toBeInTheDocument();
	expect(screen.getByRole('region', { name: 'Round 2' })).toBeInTheDocument();
});

test('shares a host bracket, adds independent guest picks, and combines the returned link', async () => {
	const host = render(Page);
	await fireEvent.input(screen.getByLabelText('Items — one per line'), {
		target: { value: 'A\nB' }
	});
	await fireEvent.click(screen.getByLabelText('Shuffle'));
	await fireEvent.click(screen.getByRole('button', { name: 'Generate bracket' }));
	await fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Alex' } });
	await fireEvent.click(screen.getByRole('button', { name: 'A' }));
	const readLink = () => (screen.getByLabelText('Bracket link') as HTMLTextAreaElement).value;
	await waitFor(() => expect(readLink()).toContain('#b='));
	const hostLink = readLink();
	const original = await decodeSession(hostLink);
	expect(original.players[0].name).toBe('Alex');
	expect(original.players[0].picks).toEqual([0]);
	host.unmount();

	localStorage.clear();
	window.history.replaceState({}, '', hostLink);
	const guest = render(Page);
	await waitFor(() =>
		expect(screen.getByRole('button', { name: 'Make my picks' })).toBeInTheDocument()
	);
	expect(screen.queryByRole('region', { name: 'Compare picks' })).not.toBeInTheDocument();
	expect(screen.getByRole('region', { name: 'Locked results' })).toBeInTheDocument();
	await fireEvent.input(screen.getByLabelText('Your name'), { target: { value: 'Sam' } });
	await fireEvent.click(screen.getByRole('button', { name: 'Make my picks' }));
	expect(screen.queryByRole('region', { name: 'Compare picks' })).not.toBeInTheDocument();
	await fireEvent.click(screen.getByRole('button', { name: 'B' }));
	await waitFor(() => expect(readLink()).not.toBe(hostLink));
	const returnedLink = readLink();
	const returned = await decodeSession(returnedLink);
	expect(returned.players.map((person) => person.picks)).toEqual([[0], [1]]);
	guest.unmount();

	localStorage.setItem(`final-cut-player:${original.id}`, original.players[0].id);
	window.history.replaceState({}, '', hostLink);
	render(Page);
	await waitFor(() => expect(screen.getByLabelText('Your name')).toHaveValue('Alex'));
	await fireEvent.input(screen.getByLabelText("Paste a friend's result link"), {
		target: { value: returnedLink }
	});
	await fireEvent.click(screen.getByRole('button', { name: 'Combine results' }));
	await waitFor(() => expect(screen.getByText('Results combined.')).toBeInTheDocument());
	const comparison = within(screen.getByRole('region', { name: 'Compare picks' }));
	expect(comparison.getByRole('columnheader', { name: 'Sam' })).toBeInTheDocument();
	expect(comparison.getByRole('cell', { name: 'A' })).toBeInTheDocument();
	expect(comparison.getByRole('cell', { name: 'B' })).toBeInTheDocument();
	expect(screen.getByRole('button', { name: 'A Winner' })).toHaveAttribute('aria-pressed', 'true');
});

test('unlocks friends’ full graphics after completion and re-locks when an earlier change clears the final', async () => {
	const own = new BracketStore(['A', 'B', 'C', 'D'], false);
	own.choose(0, 0, own.items[0].id);
	own.choose(0, 1, own.items[2].id);
	own.choose(1, 0, own.items[0].id);
	const session = addPlayer(createSession(own), 'Sam').session;
	const friend = new BracketStore(session.movies, false);
	friend.choose(0, 0, friend.items[1].id);
	friend.choose(0, 1, friend.items[3].id);
	friend.choose(1, 0, friend.items[3].id);
	session.players[1].picks = capturePicks(friend);
	localStorage.setItem(`final-cut-player:${session.id}`, session.players[0].id);
	window.history.replaceState({}, '', await encodeSession(session));
	render(Page);
	await waitFor(() =>
		expect(screen.getByRole('region', { name: 'Compare picks' })).toBeInTheDocument()
	);
	await fireEvent.click(screen.getByRole('button', { name: 'Brackets' }));
	await fireEvent.change(screen.getByLabelText('Whose bracket'), { target: { value: '1' } });
	const graph = screen.getByRole('img', { name: "Sam's full bracket" });
	expect(graph).toBeInTheDocument();
	expect(within(graph).queryByRole('button')).not.toBeInTheDocument();
	expect(graph.querySelectorAll('path')).toHaveLength(3);
	expect(graph.querySelectorAll('.graph-winner')).toHaveLength(3);
	expect(screen.queryByRole('table')).not.toBeInTheDocument();
	await fireEvent.click(screen.getByRole('button', { name: 'B' }));
	expect(screen.queryByRole('region', { name: 'Compare picks' })).not.toBeInTheDocument();
	expect(screen.queryByRole('img', { name: "Sam's full bracket" })).not.toBeInTheDocument();
	expect(screen.getByRole('region', { name: 'Locked results' })).toBeInTheDocument();
	await fireEvent.click(screen.getByRole('button', { name: 'Continue →' }));
	await fireEvent.click(screen.getByRole('button', { name: 'B' }));
	expect(screen.getByRole('table')).toBeInTheDocument();
});

test('does not let an unjoined visitor see results of a full four-person group', async () => {
	const bracket = new BracketStore(['A', 'B'], false);
	bracket.choose(0, 0, bracket.items[0].id);
	let session = createSession(bracket);
	for (const name of ['Sam', 'Lee', 'Jo']) session = addPlayer(session, name).session;
	window.history.replaceState({}, '', await encodeSession(session));
	render(Page);
	await waitFor(() =>
		expect(screen.getByRole('region', { name: 'Locked results' })).toBeInTheDocument()
	);
	expect(screen.queryByRole('region', { name: 'Compare picks' })).not.toBeInTheDocument();
	expect(screen.queryByRole('table')).not.toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Make my picks' })).not.toBeInTheDocument();
});
