import type { LinkType } from './config';

/** Where the links from one note to one target come from. */
export interface LinkKinds {
	body: boolean;
	/** Frontmatter keys, lowercase (`projects.0` → "projects"). */
	properties: Set<string>;
}

export interface SourceLinks {
	/** Frontmatter links: key as in the metadata cache (`attendees.1`) and the resolved target (path or unresolved link text). */
	frontmatter: { key: string; target: string }[];
	/** Body links and embeds, resolved. */
	body: string[];
}

/** One note's outgoing links grouped by target. */
export function kindsByTarget(links: SourceLinks): Map<string, LinkKinds> {
	const byTarget = new Map<string, LinkKinds>();
	const entry = (target: string): LinkKinds => {
		let kinds = byTarget.get(target);
		if (!kinds) {
			kinds = { body: false, properties: new Set() };
			byTarget.set(target, kinds);
		}
		return kinds;
	};
	for (const { key, target } of links.frontmatter) {
		const property = (key.split('.')[0] ?? key).toLowerCase();
		if (property !== '') entry(target).properties.add(property);
	}
	for (const target of links.body) entry(target).body = true;
	return byTarget;
}

/** First type, in priority order, that covers one of the link's sources. */
export function typeForKinds(kinds: LinkKinds | undefined, types: readonly LinkType[]): LinkType | null {
	if (!kinds) return null;
	for (const type of types) {
		if (type.source.kind === 'body' ? kinds.body : kinds.properties.has(type.source.key.toLowerCase())) return type;
	}
	return null;
}

/**
 * Type of a drawn link. The graph draws one line for a mutual pair, so the other direction
 * counts too: the drawn direction's type wins unless it is a body link (or none) and the
 * other direction comes from a property, which says more.
 */
export function typeForLink(forward: LinkKinds | undefined, backward: LinkKinds | undefined, types: readonly LinkType[]): LinkType | null {
	const own = typeForKinds(forward, types);
	if (own?.source.kind === 'property' || !backward) return own;
	const other = typeForKinds(backward, types);
	if (other?.source.kind === 'property') return other;
	return own ?? other;
}
