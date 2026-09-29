import type { BasesEntry } from 'obsidian';
import { OTHER_KEY } from '../constants';
import type { BoardConfig, Column, ColumnSpec } from '../types';

/**
 * Parse the `columns` option. Accepts a list of "value|Label" strings (label
 * optional) or a single comma-separated string. Duplicated values are dropped.
 */
export function parseColumnSpecs(raw: unknown): ColumnSpec[] {
	const items: unknown[] = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [];
	const seen = new Set<string>();
	const specs: ColumnSpec[] = [];

	for (const item of items) {
		if (typeof item !== 'string') continue;
		const [valuePart = '', ...labelParts] = item.split('|');
		const value = valuePart.trim();
		if (value === '' || seen.has(value)) continue;
		seen.add(value);
		const label = labelParts.join('|').trim();
		specs.push({ value, label: label === '' ? value : label });
	}
	return specs;
}

/**
 * Group entries into the configured columns, in configured order, followed by
 * the "other" column. Entry order inside a column follows the Bases sort.
 * `keyOf` returns the column value of an entry ('' when empty).
 */
export function groupIntoColumns(
	entries: BasesEntry[],
	cfg: BoardConfig,
	keyOf: (entry: BasesEntry) => string,
): Column[] {
	const columns: Column[] = cfg.columns.map((spec) => ({
		key: spec.value,
		label: spec.label,
		isDone: spec.value === cfg.doneValue,
		isOther: false,
		entries: [],
	}));
	const other: Column = { key: OTHER_KEY, label: cfg.otherLabel, isDone: false, isOther: true, entries: [] };
	const byKey = new Map(columns.map((column) => [column.key, column]));

	for (const entry of entries) {
		(byKey.get(keyOf(entry)) ?? other).entries.push(entry);
	}
	return [...columns, other];
}
