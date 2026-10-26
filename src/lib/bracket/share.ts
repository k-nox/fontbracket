import { BracketStore, MAX_ITEMS } from './bracket';

export interface Player {
	id: string;
	name: string;
	revision: number;
	picks: (number | null)[];
}

export interface SharedBracket {
	v: 1;
	id: string;
	movies: string[];
	players: Player[];
}

export const MAX_PLAYERS = 4;
const MAX_HASH = 60_000;
const MAX_JSON_BYTES = 200_000;
const invalid = () => new Error('Invalid bracket link.');

export function capturePicks(bracket: BracketStore): Player['picks'] {
	return bracket.rounds.flatMap((matches) =>
		matches.map((match) =>
			match.winner ? bracket.items.findIndex((item) => item.id === match.winner?.id) : null
		)
	);
}

export function restoreBracket(movies: readonly string[], picks: Player['picks']): BracketStore {
	const bracket = new BracketStore(movies, false);
	if (picks.length !== bracket.rounds.flat().length) throw invalid();
	let cursor = 0;
	bracket.rounds.forEach((matches, round) =>
		matches.forEach((match, index) => {
			const pick = picks[cursor++];
			if (pick === null) return;
			if (!Number.isInteger(pick) || pick < 0 || pick >= movies.length) throw invalid();
			const item = bracket.items[pick];
			if (match.winner) {
				if (match.winner.id !== item.id) throw invalid();
			} else {
				try {
					bracket.choose(round, index, item.id);
				} catch {
					throw invalid();
				}
			}
		})
	);
	return bracket;
}

export function validateSession(value: unknown): SharedBracket {
	if (!value || typeof value !== 'object') throw invalid();
	const session = value as SharedBracket;
	const validId = (id: unknown): id is string => typeof id === 'string' && /^[\w-]{1,64}$/.test(id);
	if (
		session.v !== 1 ||
		!validId(session.id) ||
		!Array.isArray(session.movies) ||
		session.movies.length < 2 ||
		session.movies.length > MAX_ITEMS ||
		session.movies.some(
			(label) => typeof label !== 'string' || !label.trim() || label.length > 500
		) ||
		!Array.isArray(session.players) ||
		session.players.length < 1 ||
		session.players.length > MAX_PLAYERS
	)
		throw invalid();
	const ids = new Set<string>();
	const players = session.players.map((player) => {
		if (
			!player ||
			!validId(player.id) ||
			ids.has(player.id) ||
			typeof player.name !== 'string' ||
			!player.name.trim() ||
			player.name.length > 40 ||
			!Number.isSafeInteger(player.revision) ||
			player.revision < 0 ||
			!Array.isArray(player.picks)
		)
			throw invalid();
		ids.add(player.id);
		const bracket = restoreBracket(session.movies, player.picks);
		return {
			id: player.id,
			name: player.name.trim(),
			revision: player.revision,
			picks: capturePicks(bracket)
		};
	});
	return { v: 1, id: session.id, movies: [...session.movies], players };
}

export function createSession(bracket: BracketStore): SharedBracket {
	return {
		v: 1,
		id: crypto.randomUUID(),
		movies: bracket.items.map((item) => item.label),
		players: [
			{
				id: crypto.randomUUID(),
				name: 'Player 1',
				revision: 0,
				picks: capturePicks(bracket)
			}
		]
	};
}

export function addPlayer(
	session: SharedBracket,
	name: string
): { session: SharedBracket; player: Player } {
	if (session.players.length >= MAX_PLAYERS)
		throw new Error('This bracket already has four people.');
	if (!name.trim() || name.length > 40) throw new Error('Enter a name (up to 40 characters).');
	const player: Player = {
		id: crypto.randomUUID(),
		name: name.trim(),
		revision: 0,
		picks: capturePicks(new BracketStore(session.movies, false))
	};
	return { session: { ...session, players: [...session.players, player] }, player };
}

/** Merge whole participant snapshots; never mix picks from different versions. */
export function mergeSessions(
	current: SharedBracket,
	incoming: SharedBracket,
	ownId: string | null
): SharedBracket {
	if (
		current.id !== incoming.id ||
		JSON.stringify(current.movies) !== JSON.stringify(incoming.movies)
	) {
		throw new Error('That link is for a different bracket.');
	}
	const players = current.players.map((player) => ({ ...player, picks: [...player.picks] }));
	for (const player of incoming.players) {
		const index = players.findIndex((existing) => existing.id === player.id);
		if (index === -1) players.push(player);
		else if (player.id !== ownId) {
			if (player.revision > players[index].revision) players[index] = player;
			else if (
				player.revision === players[index].revision &&
				JSON.stringify(player) !== JSON.stringify(players[index])
			) {
				throw new Error(`Conflicting results for ${player.name}. Ask for a new link.`);
			}
		}
	}
	if (players.length > MAX_PLAYERS) throw new Error('You can compare up to four people.');
	return { ...current, players };
}

async function readBounded(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			total += value.length;
			if (total > MAX_JSON_BYTES) {
				await reader.cancel();
				throw new Error('Bracket link is too large.');
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const result = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.length;
	}
	return result;
}

export async function encodeSession(session: SharedBracket): Promise<string> {
	const json = JSON.stringify(validateSession(session));
	const source = new TextEncoder().encode(json);
	if (source.length > MAX_JSON_BYTES)
		throw new Error('Link too large. Use fewer or shorter movie names.');
	let bytes: Uint8Array = source;
	let format = 'j';
	if (typeof CompressionStream !== 'undefined') {
		bytes = await readBounded(
			new Blob([source]).stream().pipeThrough(new CompressionStream('deflate'))
		);
		format = 'z';
	}
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	const hash =
		'#b=' + format + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
	if (hash.length > MAX_HASH) throw new Error('Link too large. Use fewer or shorter movie names.');
	return hash;
}

export async function decodeSession(link: string): Promise<SharedBracket> {
	if (link.length > MAX_HASH + 2048) throw invalid();
	let hash: string;
	try {
		hash = link.trim().startsWith('#') ? link.trim() : new URL(link.trim()).hash;
	} catch {
		throw invalid();
	}
	if (hash.length > MAX_HASH || !/^#b=[jz][A-Za-z0-9_-]+$/.test(hash)) throw invalid();
	try {
		const encoded = hash.slice(4).replace(/-/g, '+').replace(/_/g, '/');
		const binary = atob(encoded);
		let bytes: Uint8Array = Uint8Array.from(binary, (char) => char.charCodeAt(0));
		if (hash[3] === 'z') {
			if (typeof DecompressionStream === 'undefined')
				throw new Error('Update your browser to open this compressed bracket link.');
			bytes = await readBounded(
				new Blob([bytes as Uint8Array<ArrayBuffer>])
					.stream()
					.pipeThrough(new DecompressionStream('deflate'))
			);
		}
		if (bytes.length > MAX_JSON_BYTES) throw invalid();
		return validateSession(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
	} catch (cause) {
		if (cause instanceof Error && cause.message.startsWith('Update your browser')) throw cause;
		throw invalid();
	}
}

export function agreement(
	session: SharedBracket,
	a: Player,
	b: Player
): { same: number; total: number } {
	const template = new BracketStore(session.movies, false).rounds.flat();
	let same = 0,
		total = 0;
	a.picks.forEach((pick, index) => {
		if (template[index].winner || pick === null || b.picks[index] === null) return;
		total++;
		if (pick === b.picks[index]) same++;
	});
	return { same, total };
}
