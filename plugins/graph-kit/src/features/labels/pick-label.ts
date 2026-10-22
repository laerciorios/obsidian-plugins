import { firstMatch } from '../../rules/evaluate';
import type { NoteFacts } from '../../rules/types';
import { firstText, propertyValue } from '../../rules/values';
import type { LabelsConfig } from './config';

/** First property, in priority order, with a non-empty text. */
export function pickLabel(frontmatter: Record<string, unknown>, properties: readonly string[]): string | null {
	for (const key of properties) {
		const text = firstText(propertyValue(frontmatter, key));
		if (text !== null) return text;
	}
	return null;
}

/** Cut to `max` characters (0 = no limit), ending with an ellipsis. Counts code points, not UTF-16 units. */
export function truncate(text: string, max: number): string {
	if (max <= 0) return text;
	const chars = Array.from(text);
	if (chars.length <= max) return text;
	return `${chars.slice(0, Math.max(1, max - 1)).join('').trimEnd()}…`;
}

/**
 * The label of a note, or null to keep the file name. A matching rule decides first (its own
 * property list, or the native name); without one, scope "all" uses the default list and
 * scope "matching" keeps the file name.
 */
export function labelFor(config: LabelsConfig, facts: NoteFacts): string | null {
	const rule = firstMatch(config.rules, facts);
	let properties: readonly string[];
	if (rule) {
		if ('native' in rule.effect) return null;
		properties = rule.effect.properties.length > 0 ? rule.effect.properties : config.properties;
	} else if (config.scope === 'all') {
		properties = config.properties;
	} else {
		return null;
	}
	const label = pickLabel(facts.frontmatter, properties);
	return label === null ? null : truncate(label, config.maxLength);
}
