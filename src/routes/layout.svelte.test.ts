import { afterEach, expect, test } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Layout from './+layout.svelte';

afterEach(() => {
	localStorage.clear();
	delete document.documentElement.dataset.appearance;
});

test('switches appearances and remembers the choice', async () => {
	document.documentElement.dataset.appearance = 'dark';
	render(Layout, { children: createRawSnippet(() => ({ render: () => '<p>Content</p>' })) });
	await fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
	expect(document.documentElement.dataset.appearance).toBe('light');
	expect(localStorage.getItem('item-bracket-appearance')).toBe('light');
	await fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
	expect(document.documentElement.dataset.appearance).toBe('dark');
	expect(localStorage.getItem('item-bracket-appearance')).toBe('dark');
});
