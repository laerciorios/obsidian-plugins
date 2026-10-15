/** Test helper: throws unless `xml` is a well-formed XML document with one root element. */
export function assertWellFormed(xml: string): void {
	const token = /<!--[\s\S]*?-->|<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+="[^"<]*")*)\s*(\/?)>|([^<]+)|(<)/g;
	const entity = /&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/g;
	const stack: string[] = [];
	let roots = 0;
	let match: RegExpExecArray | null;
	const checkText = (text: string, where: string): void => {
		if (text.replace(entity, '').includes('&')) throw new Error(`Raw "&" in ${where}: ${text.slice(0, 80)}`);
	};
	while ((match = token.exec(xml))) {
		const [, closing, name, attrs, selfClosing, text, stray] = match;
		if (stray) throw new Error(`Stray "<" at ${match.index}: ${xml.slice(match.index, match.index + 60)}`);
		if (text !== undefined) {
			if (stack.length === 0 && text.trim()) throw new Error(`Text outside the root: ${text.slice(0, 40)}`);
			checkText(text, 'text');
			continue;
		}
		if (!name) continue;
		if (attrs) {
			const names = [...attrs.matchAll(/\s+([\w:.-]+)="([^"]*)"/g)];
			const seen = new Set<string>();
			for (const [, attr = '', value = ''] of names) {
				if (seen.has(attr)) throw new Error(`Duplicate attribute ${attr} on <${name}>`);
				seen.add(attr);
				checkText(value, `attribute ${attr} of <${name}>`);
			}
		}
		if (closing) {
			const open = stack.pop();
			if (open !== name) throw new Error(`</${name}> closes <${open ?? 'nothing'}>`);
		} else if (!selfClosing) {
			if (stack.length === 0) roots++;
			stack.push(name);
		} else if (stack.length === 0) {
			roots++;
		}
	}
	if (stack.length > 0) throw new Error(`Unclosed <${stack.join('>, <')}>`);
	if (roots !== 1) throw new Error(`Expected one root element, found ${roots}`);
}
