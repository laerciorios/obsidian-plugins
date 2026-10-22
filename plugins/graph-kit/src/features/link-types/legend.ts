import { colorCss } from '../../colors';
import type { GraphKind } from '../../config/types';
import type { OpenGraph } from '../../graph-internals';
import { t } from '../../i18n';
import type { LinkType, LinkTypesConfig } from './config';

export function linkTypeName(type: LinkType): string {
	return type.source.kind === 'body' ? t('linkTypes.body') : type.source.key;
}

/** A corner of the graph listing the link types; clicking one hides or shows it in that graph. */
export class LinkLegend {
	private readonly legends = new Map<HTMLElement, HTMLElement>();

	constructor(
		private readonly config: () => LinkTypesConfig,
		private readonly toggleHidden: (kind: GraphKind, typeId: string) => void,
	) {}

	show(graph: OpenGraph): void {
		this.prune();
		const config = this.config();
		const types = config.types.filter((type) => type.visible);
		if (!config.legend.show || types.length === 0) return this.remove(graph);
		let legend = this.legends.get(graph.contentEl);
		if (!legend) {
			legend = graph.contentEl.createDiv({ cls: 'gk-legend' });
			this.legends.set(graph.contentEl, legend);
		}
		legend.empty();
		legend.className = `gk-legend gk-legend-${config.legend.position}`;
		legend.setAttr('aria-label', t('linkTypes.legend'));
		const hidden = config.hidden[graph.kind];
		for (const type of types) {
			const off = hidden.includes(type.id);
			const item = legend.createEl('button', { cls: ['gk-legend-item', off ? 'is-off' : ''], attr: { 'aria-pressed': String(!off) } });
			item.setAttr('aria-label', t(off ? 'linkTypes.legend.show' : 'linkTypes.legend.hide', { type: linkTypeName(type) }));
			const swatch = item.createSpan({ cls: ['gk-legend-swatch', `gk-line-${type.style}`] });
			if (type.color) swatch.setCssProps({ '--gk-line-color': colorCss(type.color) });
			item.createSpan({ text: linkTypeName(type) });
			item.addEventListener('click', (event) => {
				event.stopPropagation();
				this.toggleHidden(graph.kind, type.id);
			});
		}
	}

	remove(graph: OpenGraph): void {
		this.legends.get(graph.contentEl)?.remove();
		this.legends.delete(graph.contentEl);
	}

	removeAll(): void {
		for (const legend of this.legends.values()) legend.remove();
		this.legends.clear();
	}

	/** Closed views took their legend with them. */
	private prune(): void {
		for (const [contentEl, legend] of this.legends) if (!contentEl.isConnected) {
			legend.remove();
			this.legends.delete(contentEl);
		}
	}
}
