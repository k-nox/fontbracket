import { describe, expect, it } from 'vitest';
import { BracketStore, parseItems } from './bracket';

describe('custom item brackets', () => {
	it('parses lines without discarding duplicates or special labels', () => {
		expect(parseItems(' A\r\n\n A \nBYE\n<b>test</b>')).toEqual(['A', 'A', 'BYE', '<b>test</b>']);
	});

	it('rejects invalid lists', () => {
		for (const labels of [[], ['A'], ['A', ' '], Array(257).fill('A')]) {
			expect(() => new BracketStore(labels)).toThrow();
		}
	});

	it('preserves the supplied list and distinguishes duplicate labels', () => {
		const labels = Object.freeze(['Same', 'Same']);
		const bracket = new BracketStore(labels, false);
		expect(bracket.items[0].id).not.toBe(bracket.items[1].id);
		bracket.choose(0, 0, bracket.items[1].id);
		expect(bracket.winner?.id).toBe(bracket.items[1].id);
	});

	it('builds balanced brackets for every supported item count with only opening byes', () => {
		for (let count = 2; count <= 256; count++) {
			const bracket = new BracketStore(
				Array.from({ length: count }, (_, i) => `Item ${i}`),
				false
			);
			const size = 2 ** Math.ceil(Math.log2(count));
			expect(bracket.rounds.flat().length).toBe(size - 1);
			expect(bracket.rounds[0].filter((match) => !match.sides[1]).length).toBe(size - count);
			let choices = 0;
			bracket.rounds.forEach((matches, round) => {
				matches.forEach((match, index) => {
					if (match.winner) return;
					expect(match.sides.every(Boolean)).toBe(true);
					bracket.choose(round, index, match.sides[0]!.id);
					choices++;
				});
			});
			expect(choices).toBe(count - 1);
			expect(bracket.winner).not.toBeNull();
		}
	});

	it('clears dependent results while preserving unrelated matches', () => {
		const bracket = new BracketStore(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], false);
		bracket.rounds.forEach((matches, round) => {
			matches.forEach((match, index) => bracket.choose(round, index, match.sides[0]!.id));
		});
		const unaffected = bracket.rounds[1][1].winner;
		bracket.choose(0, 0, bracket.items[1].id);
		expect(bracket.rounds[1][0].winner).toBeNull();
		expect(bracket.winner).toBeNull();
		expect(bracket.rounds[1][1].winner).toEqual(unaffected);
		bracket.choose(1, 0, bracket.items[1].id);
		bracket.choose(2, 0, bracket.items[1].id);
		expect(bracket.winner?.label).toBe('B');
	});

	it('rejects unknown items and unresolved matches', () => {
		const bracket = new BracketStore(['A', 'B', 'C'], false);
		expect(() => bracket.choose(1, 0, bracket.items[0].id)).toThrow();
		expect(() => bracket.choose(0, 1, 'unknown')).toThrow();
	});
});
