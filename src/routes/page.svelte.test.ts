import { describe, test, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	test('generates a full bracket and selects a champion safely', async () => {
		render(Page);
		await fireEvent.input(screen.getByLabelText('Movies — one per line'), {
			target: { value: '<img src=x onerror=alert(1)>\nBYE' }
		});
		await fireEvent.click(screen.getByLabelText('Shuffle movies before pairing'));
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
		await fireEvent.input(screen.getByLabelText('Movies — one per line'), {
			target: { value: 'Only one' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Generate bracket' }));
		expect(screen.getByRole('alert')).toHaveTextContent('Enter between 2 and 256');
	});
});

test('uses one round at a time and allows browsing the complete bracket', async () => {
	render(Page);
	await fireEvent.input(screen.getByLabelText('Movies — one per line'), {
		target: { value: 'A\nB\nC\nD' }
	});
	await fireEvent.click(screen.getByLabelText('Shuffle movies before pairing'));
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
