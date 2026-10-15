/** Minimal SVG/XML string building. */

export type Attributes = Record<string, string | number | undefined | null | false>;

/** Characters XML 1.0 does not allow, even escaped. */
const INVALID_XML = /[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g;

export function escapeXml(text: string): string {
	return text
		.replace(INVALID_XML, '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

const formatNumber = (value: number): string => String(Math.round(value * 100) / 100);

export function attributes(attrs: Attributes): string {
	let out = '';
	for (const [name, value] of Object.entries(attrs)) {
		if (value === undefined || value === null || value === false) continue;
		out += ` ${name}="${typeof value === 'number' ? formatNumber(value) : escapeXml(value)}"`;
	}
	return out;
}

/** An element with children (already serialized) or self-closing. */
export function el(tag: string, attrs: Attributes = {}, children?: string | string[]): string {
	const content = Array.isArray(children) ? children.join('') : children;
	return content === undefined || content === '' ? `<${tag}${attributes(attrs)}/>` : `<${tag}${attributes(attrs)}>${content}</${tag}>`;
}
