import { THEMES } from './colors';
import { escapeXml } from './svg';

/**
 * A standalone HTML page that shows a rendered canvas with pan, zoom and a light/dark switch. It
 * opens from disk (`file://`) without a server: both themes are inlined as SVG, the script is
 * inlined, and only images load from relative paths (assets/).
 */

export interface ViewerLabels {
	zoomIn: string;
	zoomOut: string;
	fit: string;
	theme: string;
}

export interface ViewerPage {
	title: string;
	/** `lang` of the page, e.g. "pt-BR". */
	lang: string;
	/** Rendered SVGs (same canvas, both themes). Use different id prefixes for each. */
	light: string;
	dark: string;
	width: number;
	height: number;
	/** Theme on first open; "system" follows the visitor's setting. */
	theme: 'system' | 'light' | 'dark';
	labels: ViewerLabels;
	generator?: string;
}

/**
 * Pan, zoom and theme switching. Self-contained (inlined with `Function.prototype.toString`), so
 * it must not reference anything outside its body.
 */
export function viewerRuntime(): void {
	const doc = document;
	const root = doc.documentElement;
	const stage = doc.getElementById('jc-stage');
	const world = doc.getElementById('jc-world');
	if (!stage || !world) return;
	const width = Number(world.dataset.width) || 1;
	const height = Number(world.dataset.height) || 1;
	const MIN = 0.05;
	const MAX = 8;
	let x = 0;
	let y = 0;
	let k = 1;

	const apply = (): void => {
		world.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
	};
	const fit = (): void => {
		const rect = stage.getBoundingClientRect();
		k = Math.max(MIN, Math.min(1, (rect.width - 32) / width, (rect.height - 32) / height));
		x = (rect.width - width * k) / 2;
		y = (rect.height - height * k) / 2;
		apply();
	};
	const zoomAt = (px: number, py: number, factor: number): void => {
		const next = Math.max(MIN, Math.min(MAX, k * factor));
		x = px - (px - x) * (next / k);
		y = py - (py - y) * (next / k);
		k = next;
		apply();
	};
	const center = (): { x: number; y: number } => {
		const rect = stage.getBoundingClientRect();
		return { x: rect.width / 2, y: rect.height / 2 };
	};

	stage.addEventListener(
		'wheel',
		(event) => {
			event.preventDefault();
			const rect = stage.getBoundingClientRect();
			// Lines (Firefox) and pages become pixels; a mouse wheel notch (~100px) zooms ~30%,
			// a trackpad pinch (small deltas, ctrlKey) zooms smoothly.
			const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
			const dx = event.deltaX * unit;
			const dy = event.deltaY * unit;
			if (event.ctrlKey || event.metaKey) {
				zoomAt(event.clientX - rect.left, event.clientY - rect.top, Math.exp(-Math.max(-30, Math.min(30, dy)) * 0.01));
			} else {
				x -= dx;
				y -= dy;
				apply();
			}
		},
		{ passive: false },
	);

	// Drag to pan with one pointer, pinch with two. Dragging starts after a few pixels, so a
	// click on a link still opens it.
	const pointers = new Map<number, { x: number; y: number }>();
	let dragging = false;
	let start = { x: 0, y: 0 };
	let pinch = 0;
	stage.addEventListener('pointerdown', (event) => {
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		start = { x: event.clientX, y: event.clientY };
		dragging = false;
		if (pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			pinch = a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
		}
	});
	stage.addEventListener('pointermove', (event) => {
		const previous = pointers.get(event.pointerId);
		if (!previous) return;
		const current = { x: event.clientX, y: event.clientY };
		pointers.set(event.pointerId, current);
		if (pointers.size >= 2) {
			const [a, b] = [...pointers.values()];
			if (!a || !b) return;
			const distance = Math.hypot(a.x - b.x, a.y - b.y);
			const rect = stage.getBoundingClientRect();
			if (pinch > 0) zoomAt((a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top, distance / pinch);
			pinch = distance;
			dragging = true;
			return;
		}
		if (!dragging && Math.hypot(current.x - start.x, current.y - start.y) < 4) return;
		if (!dragging) {
			dragging = true;
			stage.setPointerCapture(event.pointerId);
			stage.classList.add('is-dragging');
		}
		x += current.x - previous.x;
		y += current.y - previous.y;
		apply();
	});
	const release = (event: PointerEvent): void => {
		pointers.delete(event.pointerId);
		if (pointers.size < 2) pinch = 0;
		if (pointers.size === 0) stage.classList.remove('is-dragging');
	};
	stage.addEventListener('pointerup', release);
	stage.addEventListener('pointercancel', release);
	stage.addEventListener(
		'click',
		(event) => {
			// A drag that ends on a link must not open it.
			if (dragging) {
				event.preventDefault();
				event.stopPropagation();
				dragging = false;
			}
		},
		true,
	);

	const setTheme = (theme: string): void => {
		root.dataset.theme = theme;
		try {
			localStorage.setItem('jc-theme', theme);
		} catch {
			// Storage may be off for files; the choice just is not remembered.
		}
	};
	const actions: Record<string, () => void> = {
		'zoom-in': () => zoomAt(center().x, center().y, 1.25),
		'zoom-out': () => zoomAt(center().x, center().y, 0.8),
		fit,
		theme: () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'),
	};
	doc.querySelectorAll<HTMLElement>('[data-action]').forEach((button) => {
		button.addEventListener('click', () => actions[button.dataset.action ?? '']?.());
	});
	doc.addEventListener('keydown', (event) => {
		if (event.target instanceof HTMLInputElement) return;
		const key = event.key === '+' || event.key === '=' ? 'zoom-in' : event.key === '-' ? 'zoom-out' : event.key === '0' ? 'fit' : '';
		if (key) actions[key]?.();
	});
	window.addEventListener('resize', fit);
	fit();
}

/** Picks the first theme before the page paints: a saved choice, the setting, or the system. */
function themeScript(theme: ViewerPage['theme']): string {
	return (
		`(function(){var t=${JSON.stringify(theme)};try{t=localStorage.getItem('jc-theme')||t}catch(e){}` +
		`if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';` +
		`document.documentElement.dataset.theme=t})();`
	);
}

const ICONS = {
	zoomOut: '<path d="M5 12h14"/>',
	zoomIn: '<path d="M5 12h14M12 5v14"/>',
	fit: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
	theme: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/>',
};

function button(action: string, label: string, icon: string): string {
	const text = escapeXml(label);
	return (
		`<button type="button" data-action="${action}" aria-label="${text}" title="${text}">` +
		`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg></button>`
	);
}

/** The whole page, ready to save as index.html. */
export function viewerPage(page: ViewerPage): string {
	const light = THEMES.light;
	const dark = THEMES.dark;
	const css = `
*{box-sizing:border-box}
html,body{margin:0;height:100%;overflow:hidden}
:root{--bg:${light.background};--fg:${light.text};--muted:${light.muted};--bar:${light.background};--line:#e3e3e3;--dot:#d7d7d7;color-scheme:light}
:root[data-theme="dark"]{--bg:${dark.background};--fg:${dark.text};--muted:${dark.muted};--bar:#262626;--line:#363636;--dot:#333333;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;display:flex;flex-direction:column}
.jc-bar{display:flex;align-items:center;gap:12px;padding:8px 12px;background:var(--bar);border-bottom:1px solid var(--line);flex:none}
.jc-bar h1{flex:1;min-width:0;margin:0;font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.jc-actions{display:flex;gap:4px}
.jc-actions button{display:flex;align-items:center;justify-content:center;width:34px;height:34px;padding:0;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--muted);cursor:pointer}
.jc-actions button:hover,.jc-actions button:focus-visible{color:var(--fg);border-color:var(--muted)}
#jc-stage{position:relative;flex:1;overflow:hidden;touch-action:none;cursor:grab;background-image:radial-gradient(var(--dot) 1px,transparent 1px);background-size:20px 20px}
#jc-stage.is-dragging{cursor:grabbing}
#jc-world{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
#jc-world svg{display:block}
:root[data-theme="dark"] .jc-light,:root:not([data-theme="dark"]) .jc-dark{display:none}
@media (max-width:480px){.jc-bar{padding:6px 8px}.jc-actions button{width:40px;height:40px}}
`;
	const runtime = `(${viewerRuntime.toString()})();`;
	return `<!doctype html>
<html lang="${escapeXml(page.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${page.generator ? `<meta name="generator" content="${escapeXml(page.generator)}">\n` : ''}<title>${escapeXml(page.title)}</title>
<script>${themeScript(page.theme)}</script>
<style>${css}</style>
</head>
<body>
<header class="jc-bar"><h1>${escapeXml(page.title)}</h1><nav class="jc-actions">${button('zoom-out', page.labels.zoomOut, ICONS.zoomOut)}${button('fit', page.labels.fit, ICONS.fit)}${button('zoom-in', page.labels.zoomIn, ICONS.zoomIn)}${button('theme', page.labels.theme, ICONS.theme)}</nav></header>
<main id="jc-stage"><div id="jc-world" data-width="${page.width}" data-height="${page.height}"><div class="jc-light">${page.light}</div><div class="jc-dark">${page.dark}</div></div></main>
<script>${runtime}</script>
</body>
</html>
`;
}
