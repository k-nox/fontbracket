import { describe, expect, it } from 'vitest';
import { BracketStore } from './bracket';
import {
	addPlayer,
	agreement,
	capturePicks,
	createSession,
	decodeSession,
	encodeSession,
	finalizeSession,
	mergeSessions,
	restoreBracket,
	validateSession
} from './share';

function finish(bracket: BracketStore, side = 0) {
	bracket.rounds.forEach((matches, round) =>
		matches.forEach((match, index) => {
			if (!match.winner) bracket.choose(round, index, match.sides[side]!.id);
		})
	);
	return bracket;
}

function snapshot(count = 5) {
	const bracket = finish(new BracketStore(Array.from({ length: count }, (_, i) => `Item ${i}`)));
	return createSession(bracket);
}

describe('URL brackets', () => {
	it('round-trips shuffled Unicode labels, duplicate names, BYE, and choices', async () => {
		const bracket = finish(new BracketStore(['天空の城 🏰', 'Same', 'Same', 'BYE', '<script>']));
		const session = createSession(bracket);
		const hash = await encodeSession(session);
		const decoded = await decodeSession(`https://example.com/${hash}`);
		expect(decoded).toEqual(session);
		const restored = restoreBracket(decoded.movies, decoded.players[0].picks);
		expect(restored.items.map((item) => item.label)).toEqual(
			bracket.items.map((item) => item.label)
		);
		expect(restored.winner?.label).toBe(bracket.winner?.label);
		expect(capturePicks(restored)).toEqual(capturePicks(bracket));
	});

	it('preserves partial picks and supports the uncompressed format', async () => {
		const session = createSession(new BracketStore(['A', 'B', 'C', 'D'], false));
		const hash =
			'#b=j' +
			btoa(JSON.stringify(session)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
		expect(await decodeSession(hash)).toEqual(session);
		expect(restoreBracket(session.movies, session.players[0].picks).winner).toBeNull();
	});

	it('lets four people make independent choices on the same opening bracket', () => {
		let session = snapshot(9);
		const original = structuredClone(session);
		for (const name of ['Sam', 'Lee', 'Jo']) session = addPlayer(session, name).session;
		expect(session.players).toHaveLength(4);
		expect(session.players[0]).toEqual(original.players[0]);
		for (const person of session.players.slice(1)) {
			const bracket = restoreBracket(session.movies, person.picks);
			expect(bracket.winner).toBeNull();
			expect(bracket.rounds[0].map((match) => match.sides)).toEqual(
				new BracketStore(session.movies, false).rounds[0].map((match) => match.sides)
			);
		}
		expect(() => addPlayer(session, 'Fifth')).toThrow('four');
	});

	it('combines returned links without overwriting the owner or mixing result versions', () => {
		const host = snapshot();
		const joined = addPlayer(host, 'Sam');
		const newer = structuredClone(joined.session);
		newer.players[1].picks = capturePicks(finish(new BracketStore(host.movies, false), 1));
		newer.players[1].revision = 4;
		newer.players[0].revision = 99;
		newer.players[0].name = 'Stale copy of owner';
		const merged = mergeSessions(host, newer, host.players[0].id);
		expect(merged.players[0]).toEqual(host.players[0]);
		expect(merged.players[1]).toEqual(newer.players[1]);
		expect(mergeSessions(merged, joined.session, host.players[0].id).players[1]).toEqual(
			newer.players[1]
		);
		expect(host.players).toHaveLength(1);
	});

	it('rejects other brackets, conflicting versions, and a fifth person atomically', () => {
		const host = snapshot();
		expect(() => mergeSessions(host, snapshot(), null)).toThrow('different bracket');
		const otherOrder = { ...host, movies: [...host.movies].reverse() };
		expect(() => mergeSessions(host, otherOrder, null)).toThrow('different bracket');
		const conflicting = structuredClone(host);
		conflicting.players[0].name = 'Different';
		expect(() => mergeSessions(host, conflicting, null)).toThrow('Conflicting');
		let full = host;
		for (const name of ['A', 'B', 'C']) full = addPlayer(full, name).session;
		const fifth = addPlayer(host, 'Fifth').session;
		expect(() => mergeSessions(full, fifth, null)).toThrow('four');
		expect(full.players).toHaveLength(4);
	});

	it('excludes byes and unresolved matches from agreement', () => {
		const session = createSession(new BracketStore(['A', 'B', 'C'], false));
		const joined = addPlayer(session, 'Sam');
		expect(agreement(joined.session, joined.session.players[0], joined.player)).toEqual({
			same: 0,
			total: 0
		});
		const a = {
			...session.players[0],
			picks: capturePicks(finish(new BracketStore(session.movies, false)))
		};
		const b = { ...joined.player, picks: [...a.picks] };
		expect(agreement(session, a, b)).toEqual({ same: 2, total: 2 });
	});

	it('rejects invalid winners, impossible advancement, malformed or oversized payloads', async () => {
		const session = createSession(new BracketStore(['A', 'B', 'C', 'D'], false));
		const bad = structuredClone(session);
		bad.players[0].picks[0] = 3;
		expect(() => validateSession(bad)).toThrow();
		bad.players[0].picks = [null, null, 0];
		expect(() => validateSession(bad)).toThrow();
		for (const value of [
			null,
			{ ...session, v: 2 },
			{ ...session, players: Array(5).fill(session.players[0]) },
			{ ...session, movies: ['A'] }
		]) {
			expect(() => validateSession(value)).toThrow();
		}
		for (const hash of ['#b=jnot-json', '#b=zAA', '#b=x123', '#b=j' + 'a'.repeat(60001)]) {
			await expect(decodeSession(hash)).rejects.toThrow();
		}
	});

	it('keeps a 256-item, four-person bracket under the link limit', async () => {
		let session = snapshot(256);
		for (const name of ['Sam', 'Lee', 'Jo']) session = addPlayer(session, name).session;
		const hash = await encodeSession(session);
		expect(hash.length).toBeLessThan(60000);
		expect(await decodeSession(hash)).toEqual(session);
	});
});

it('finalizes a complete group, preserves the flag in links, and blocks further editing', async () => {
	let session = snapshot(4);
	session = addPlayer(session, 'Sam').session;
	session.players[1].picks = capturePicks(finish(new BracketStore(session.movies, false), 1));
	const final = finalizeSession(session);
	expect(final.complete).toBe(true);
	expect(session.complete).toBeUndefined();
	expect(await decodeSession(await encodeSession(final))).toEqual(final);
	expect(() => addPlayer(final, 'Jo')).toThrow('read-only');
	expect(() => mergeSessions(final, session, final.players[0].id)).toThrow('read-only');
});

it('does not allow unfinished or malformed groups to claim final results', () => {
	const partial = createSession(new BracketStore(['A', 'B'], false));
	expect(() => finalizeSession(partial)).toThrow('Everyone');
	expect(() => validateSession({ ...partial, complete: true })).toThrow();
	expect(() => validateSession({ ...snapshot(), complete: 'yes' })).toThrow();
	const joined = addPlayer(snapshot(), 'Sam').session;
	expect(() => finalizeSession(joined)).toThrow('Everyone');
});

it('only adopts a returned final flag if every merged result matches the final snapshot', () => {
	const current = createSession(new BracketStore(['A', 'B'], false));
	const returned = addPlayer(current, 'Sam').session;
	returned.players = returned.players.map((person) => ({ ...person, revision: 1, picks: [0] }));
	const final = finalizeSession(returned);
	const merged = mergeSessions(current, final, current.players[0].id);
	expect(merged.players[0].picks).toEqual([null]);
	expect(merged.complete).not.toBe(true);
	const finishedOwn = { ...current, players: [returned.players[0]] };
	expect(mergeSessions(finishedOwn, final, current.players[0].id).complete).toBe(true);
});
