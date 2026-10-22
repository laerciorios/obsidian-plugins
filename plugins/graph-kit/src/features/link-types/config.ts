import { readColor } from '../../colors';
import type { ColorSpec } from '../../colors';
import { isRecord, newRuleId } from '../../config/reader';
import type { Raw, Reader } from '../../config/reader';
import type { FeatureConfigBase } from '../../config/types';

/** Where a link comes from: a frontmatter property (`projects: [[...]]`) or the note body. */
export type LinkSource = { kind: 'property'; key: string } | { kind: 'body' };

export type LineStyle = 'solid' | 'dashed' | 'dotted';
export const LINE_STYLES: readonly LineStyle[] = ['solid', 'dashed', 'dotted'];

export interface LinkType {
	id: string;
	source: LinkSource;
	/** Null keeps the graph's own color. */
	color: ColorSpec | null;
	style: LineStyle;
	/** Off hides these links in every graph (the legend hides them per graph). */
	visible: boolean;
}

export type LegendPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export const LEGEND_POSITIONS: readonly LegendPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export interface LinkTypesConfig extends FeatureConfigBase {
	/** In priority order: a link from several sources takes the first type that matches. */
	types: LinkType[];
	legend: { show: boolean; position: LegendPosition };
	/** Type ids hidden from the legend, per graph. */
	hidden: { 'global': string[]; local: string[] };
}

export function bodyType(): LinkType {
	return { id: 'body', source: { kind: 'body' }, color: null, style: 'solid', visible: true };
}

export function propertyType(key: string, color: ColorSpec | null = null): LinkType {
	return { id: newRuleId(), source: { kind: 'property', key }, color, style: 'solid', visible: true };
}

export function defaultLinkTypes(): LinkTypesConfig {
	return {
		enabled: false,
		graphs: { global: true, local: true },
		types: [bodyType()],
		legend: { show: true, position: 'bottom-left' },
		hidden: { global: [], local: [] },
	};
}

function readType(value: unknown): LinkType | null {
	if (!isRecord(value) || typeof value.id !== 'string' || value.id.trim() === '') return null;
	const source = isRecord(value.source) ? value.source : null;
	let parsed: LinkSource;
	if (source?.kind === 'body') parsed = { kind: 'body' };
	else if (source?.kind === 'property' && typeof source.key === 'string' && source.key.trim() !== '') parsed = { kind: 'property', key: source.key.trim() };
	else return null;
	return {
		id: value.id.trim(),
		source: parsed,
		color: value.color === null || value.color === undefined ? null : readColor(value.color),
		style: LINE_STYLES.find((style) => style === value.style) ?? 'solid',
		visible: typeof value.visible === 'boolean' ? value.visible : true,
	};
}

export function readLinkTypes(raw: Raw | null, reader: Reader, path: string): LinkTypesConfig {
	const config = defaultLinkTypes();
	if (!raw) return config;
	reader.unknownKeys(raw, ['enabled', 'graphs', 'types', 'legend', 'hidden'], path);
	config.enabled = reader.bool(raw, 'enabled', config.enabled, path);
	config.graphs = reader.graphs(raw, config.graphs, path);
	if (raw.types !== undefined) {
		if (Array.isArray(raw.types)) {
			const ids = new Set<string>();
			config.types = [];
			raw.types.forEach((item, index) => {
				const type = readType(item);
				if (type && !ids.has(type.id)) {
					ids.add(type.id);
					config.types.push(type);
				} else {
					reader.warn(`${path}.types[${index}]`);
				}
			});
		} else {
			reader.warn(`${path}.types`);
		}
	}
	const legend = reader.record(raw.legend, `${path}.legend`);
	if (legend) {
		config.legend.show = reader.bool(legend, 'show', config.legend.show, `${path}.legend`);
		config.legend.position = reader.oneOf(legend, 'position', LEGEND_POSITIONS, config.legend.position, `${path}.legend`);
	}
	const hidden = reader.record(raw.hidden, `${path}.hidden`);
	if (hidden) {
		config.hidden.global = reader.stringList(hidden, 'global', [], `${path}.hidden`);
		config.hidden.local = reader.stringList(hidden, 'local', [], `${path}.hidden`);
	}
	return config;
}
