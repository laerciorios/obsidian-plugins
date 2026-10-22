import { firstMatch } from '../../rules/evaluate';
import type { NoteFacts } from '../../rules/types';
import { propertyValue } from '../../rules/values';
import type { ImagesConfig } from './config';

export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'];

export type ImageSource = { kind: 'vault'; linkpath: string } | { kind: 'url'; url: string };

function isImagePath(path: string): boolean {
	const extension = path.split('.').pop()?.toLowerCase() ?? '';
	return path.includes('.') && IMAGE_EXTENSIONS.includes(extension);
}

function vault(target: string): ImageSource | null {
	const linkpath = (target.split('#')[0] ?? '').split('|')[0]?.trim() ?? '';
	return linkpath !== '' && isImagePath(linkpath) ? { kind: 'vault', linkpath } : null;
}

/**
 * An image named in a property: `[[cover.jpg]]`, `![[cover.jpg|200]]`, `![alt](path or URL)`,
 * a plain vault path, or an http(s) URL. Null for anything else (a note link, plain text).
 */
export function parseImageValue(text: string): ImageSource | null {
	const value = text.trim();
	const wiki = /^!?\[\[([^\]]+)\]\]$/.exec(value);
	if (wiki) return vault(wiki[1] ?? '');
	const markdown = /^!?\[[^\]]*\]\(<?([^)>]+)>?\)$/.exec(value);
	const target = markdown ? (markdown[1] ?? '').trim() : value;
	if (/^https?:\/\//i.test(target)) return { kind: 'url', url: target };
	// Other schemes (file:, ftp:, data:...) are not images Graph Kit loads.
	if (/^[a-z][\w+.-]*:/i.test(target)) return null;
	return vault(decode(target));
}

/** Markdown paths may be URL-encoded (`My%20cover.png`). */
function decode(text: string): string {
	try {
		return decodeURI(text);
	} catch {
		return text;
	}
}

/** First image among a property's values (a list gives its first image item). */
export function imageIn(value: unknown): ImageSource | null {
	const items = Array.isArray(value) ? value : [value];
	for (const item of items) {
		if (typeof item !== 'string') continue;
		const source = parseImageValue(item);
		if (source) return source;
	}
	return null;
}

/** The image of a note: a matching rule decides first, then the default properties. */
export function imageSourceFor(config: ImagesConfig, facts: NoteFacts): ImageSource | null {
	const rule = firstMatch(config.rules, facts);
	let properties = config.properties;
	if (rule) {
		if ('none' in rule.effect) return null;
		if ('image' in rule.effect) return parseImageValue(rule.effect.image);
		if (rule.effect.properties.length > 0) properties = rule.effect.properties;
	}
	for (const key of properties) {
		const source = imageIn(propertyValue(facts.frontmatter, key));
		if (source) return source;
	}
	return null;
}

/** Square crop in the middle of an image (what fits a round node), as a source rectangle. */
export function centerSquare(width: number, height: number): { x: number; y: number; size: number } {
	const size = Math.min(width, height);
	return { x: (width - size) / 2, y: (height - size) / 2, size };
}
