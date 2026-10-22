import { CONDITION_TYPES } from '../rules/types';
import type { Condition, ConditionType, Rule } from '../rules/types';
import type { GraphToggles } from './types';

export type Raw = Record<string, unknown>;

export function isRecord(value: unknown): value is Raw {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Random id for a new rule: 6 lowercase letters/digits. */
export function newRuleId(): string {
	let id = '';
	while (id.length < 6) id += Math.random().toString(36).slice(2);
	return id.slice(0, 6);
}

/**
 * Reads untrusted JSON (data.json or an import) value by value: a wrong value falls back to its
 * default and leaves a warning with its path (e.g. "features.labels.scope"); unknown keys are
 * dropped with a warning too.
 */
export class Reader {
	readonly warnings: string[] = [];

	constructor(private readonly newId: () => string = newRuleId) {}

	warn(path: string): void {
		this.warnings.push(path);
	}

	/** An object, or null (with a warning when something else was there). */
	record(value: unknown, path: string): Raw | null {
		if (value === undefined) return null;
		if (isRecord(value)) return value;
		this.warn(path);
		return null;
	}

	unknownKeys(raw: Raw, known: readonly string[], path: string): void {
		for (const key of Object.keys(raw)) if (!known.includes(key)) this.warn(join(path, key));
	}

	bool(raw: Raw, key: string, fallback: boolean, path: string): boolean {
		const value = raw[key];
		if (typeof value === 'boolean') return value;
		if (value !== undefined) this.warn(join(path, key));
		return fallback;
	}

	integer(raw: Raw, key: string, fallback: number, range: { min: number; max: number }, path: string): number {
		const value = raw[key];
		if (typeof value === 'number' && Number.isInteger(value)) return Math.min(range.max, Math.max(range.min, value));
		if (value !== undefined) this.warn(join(path, key));
		return fallback;
	}

	oneOf<T extends string>(raw: Raw, key: string, options: readonly T[], fallback: T, path: string): T {
		const value = raw[key];
		const found = options.find((option) => option === value);
		if (found !== undefined) return found;
		if (value !== undefined) this.warn(join(path, key));
		return fallback;
	}

	/** Non-empty trimmed strings, without duplicates. */
	stringList(raw: Raw, key: string, fallback: string[], path: string): string[] {
		const value = raw[key];
		if (value === undefined) return fallback;
		if (!Array.isArray(value)) {
			this.warn(join(path, key));
			return fallback;
		}
		const items: string[] = [];
		value.forEach((item, index) => {
			if (typeof item === 'string' && item.trim() !== '') {
				if (!items.includes(item.trim())) items.push(item.trim());
			} else {
				this.warn(`${join(path, key)}[${index}]`);
			}
		});
		return items;
	}

	graphs(raw: Raw, fallback: GraphToggles, path: string): GraphToggles {
		const graphs = this.record(raw.graphs, join(path, 'graphs'));
		if (!graphs) return { ...fallback };
		const at = join(path, 'graphs');
		this.unknownKeys(graphs, ['global', 'local'], at);
		return { global: this.bool(graphs, 'global', fallback.global, at), local: this.bool(graphs, 'local', fallback.local, at) };
	}

	/** Rules in order; a rule with a broken effect is dropped, a broken condition only loses that condition. */
	rules<E>(raw: Raw, key: string, effect: (value: unknown, path: string) => E | null, path: string): Rule<E>[] {
		const value = raw[key];
		const at = join(path, key);
		if (value === undefined) return [];
		if (!Array.isArray(value)) {
			this.warn(at);
			return [];
		}
		const rules: Rule<E>[] = [];
		const ids = new Set<string>();
		value.forEach((item, index) => {
			const rulePath = `${at}[${index}]`;
			const rule = this.record(item, rulePath);
			if (!rule) return;
			this.unknownKeys(rule, ['id', 'name', 'enabled', 'match', 'conditions', 'effect'], rulePath);
			const parsedEffect = effect(rule.effect, join(rulePath, 'effect'));
			if (parsedEffect === null) {
				this.warn(join(rulePath, 'effect'));
				return;
			}
			let id = typeof rule.id === 'string' && /^[\w-]{1,32}$/.test(rule.id) ? rule.id : '';
			if (id === '' || ids.has(id)) id = this.uniqueId(ids);
			ids.add(id);
			rules.push({
				id,
				name: typeof rule.name === 'string' ? rule.name.trim() : '',
				enabled: this.bool(rule, 'enabled', true, rulePath),
				match: this.oneOf(rule, 'match', ['all', 'any'] as const, 'all', rulePath),
				conditions: this.conditions(rule.conditions, join(rulePath, 'conditions')),
				effect: parsedEffect,
			});
		});
		return rules;
	}

	private uniqueId(taken: Set<string>): string {
		let id = this.newId();
		while (taken.has(id)) id = this.newId();
		return id;
	}

	private conditions(value: unknown, path: string): Condition[] {
		if (value === undefined) return [];
		if (!Array.isArray(value)) {
			this.warn(path);
			return [];
		}
		const conditions: Condition[] = [];
		value.forEach((item, index) => {
			const condition = isRecord(item) ? readCondition(item) : null;
			if (condition) conditions.push(condition);
			else this.warn(`${path}[${index}]`);
		});
		return conditions;
	}
}

function join(path: string, key: string): string {
	return path === '' ? key : `${path}.${key}`;
}

function text(value: unknown): string | null {
	if (typeof value === 'string') return value.trim();
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return null;
}

function flag(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

/** One condition, or null when its type or required fields are missing. */
export function readCondition(raw: Raw): Condition | null {
	const type = CONDITION_TYPES.find((option): option is ConditionType => option === raw.type);
	const not = flag(raw.not, false);
	switch (type) {
		case 'folder': {
			const path = text(raw.path);
			return path === null ? null : { type, path, subfolders: flag(raw.subfolders, true), not };
		}
		case 'tag': {
			const tag = text(raw.tag)?.replace(/^#/, '');
			return tag ? { type, tag, nested: flag(raw.nested, true), not } : null;
		}
		case 'filename': {
			const value = text(raw.value);
			return value ? { type, value, not } : null;
		}
		case 'propertyExists': {
			const key = text(raw.key);
			return key ? { type, key, not } : null;
		}
		case 'propertyEquals': {
			const key = text(raw.key);
			const value = text(raw.value);
			return key && value !== null ? { type, key, value, not } : null;
		}
		default:
			return null;
	}
}
