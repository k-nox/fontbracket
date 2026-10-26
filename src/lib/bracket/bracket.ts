export interface Item {
	id: string;
	label: string;
}

export interface Match {
	id: string;
	sides: [Item | null, Item | null];
	winner: Item | null;
}

export const MAX_ITEMS = 256;

export function parseItems(text: string): string[] {
	return text
		.split(/\r?\n/)
		.map((label) => label.trim())
		.filter(Boolean);
}

/** A complete single-elimination tree. null is a bye in round one, TBD thereafter. */
export class BracketStore {
	items: Item[];
	rounds: Match[][] = [];

	constructor(labels: readonly string[], randomize = true) {
		if (labels.length < 2 || labels.length > MAX_ITEMS || labels.some((label) => !label.trim())) {
			throw new Error(`Enter between 2 and ${MAX_ITEMS} non-empty items.`);
		}
		this.items = labels.map((label, index) => ({ id: `item-${index}`, label: label.trim() }));
		if (randomize) {
			for (let i = this.items.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[this.items[i], this.items[j]] = [this.items[j], this.items[i]];
			}
		}
		const size = 2 ** Math.ceil(Math.log2(this.items.length));
		const byes = size - this.items.length;
		let cursor = 0;
		for (let count = size / 2, round = 0; count >= 1; count /= 2, round++) {
			this.rounds.push(
				Array.from({ length: count }, (_, match) => ({
					id: `round-${round}-match-${match}`,
					sides:
						round === 0
							? [this.items[cursor++], match < byes ? null : this.items[cursor++]]
							: [null, null],
					winner: null
				}))
			);
		}
		this.reconcile();
	}

	get winner(): Item | null {
		return this.rounds[this.rounds.length - 1][0].winner;
	}

	choose(round: number, match: number, itemId: string): void {
		const contest = this.rounds[round]?.[match];
		if (!contest || !contest.sides[0] || !contest.sides[1]) {
			throw new Error('Both contestants must be known before choosing a winner.');
		}
		const winner = contest.sides.find((item) => item?.id === itemId);
		if (!winner) throw new Error('Choose an item in this match.');
		contest.winner = winner;
		this.reconcile();
	}

	/** Invalidate dependent results if an earlier choice changes. */
	private reconcile(): void {
		this.rounds.forEach((matches, round) => {
			matches.forEach((match, index) => {
				if (round === 0) {
					if (!match.sides[1]) match.winner = match.sides[0];
					return;
				}
				const previous = this.rounds[round - 1];
				const sides: Match['sides'] = [previous[index * 2].winner, previous[index * 2 + 1].winner];
				if (sides.some((item, side) => item?.id !== match.sides[side]?.id)) {
					match.winner = null;
				}
				match.sides = sides;
			});
		});
	}
}
