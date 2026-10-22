import { getIcon } from 'obsidian';

/** Markup of a Lucide icon bundled with Obsidian, by id without the `lucide-` prefix. */
export function lucideSvg(id: string): string | null {
	const svg = getIcon(`lucide-${id}`);
	// XMLSerializer keeps the xmlns that a data: URL image needs (outerHTML drops it).
	return svg ? new XMLSerializer().serializeToString(svg) : null;
}
