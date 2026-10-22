import { isRecord } from '../../config/reader';
import type { Raw, Reader } from '../../config/reader';
import type { FeatureConfigBase } from '../../config/types';
import type { Rule } from '../../rules/types';

/** Text is an emoji or a few characters; lucide is an icon id without the `lucide-` prefix. */
export type IconSpec = { kind: 'text'; value: string } | { kind: 'lucide'; value: string };

/** Rule effect: a fixed icon, the value of another property, or no icon. */
export type IconEffect = { icon: IconSpec } | { property: string } | { none: true };

export interface IconsConfig extends FeatureConfigBase {
	/** Property holding the icon (emoji, character or Lucide id), for notes no rule matched. */
	property: string;
	/** Fall back to the symbol Folder Style shows for the note's folder (read from its data.json). */
	useFolderStyle: boolean;
	rules: Rule<IconEffect>[];
}

export function defaultIcons(): IconsConfig {
	return { enabled: false, graphs: { global: true, local: true }, property: 'icon', useFolderStyle: false, rules: [] };
}

export function readIconSpec(value: unknown): IconSpec | null {
	if (!isRecord(value) || typeof value.value !== 'string' || value.value.trim() === '') return null;
	if (value.kind === 'text' || value.kind === 'lucide') return { kind: value.kind, value: value.value.trim() };
	return null;
}

export function readIconEffect(value: unknown): IconEffect | null {
	if (!isRecord(value)) return null;
	if (value.none === true) return { none: true };
	if (typeof value.property === 'string' && value.property.trim() !== '') return { property: value.property.trim() };
	const icon = readIconSpec(value.icon);
	return icon ? { icon } : null;
}

export function readIcons(raw: Raw | null, reader: Reader, path: string): IconsConfig {
	const config = defaultIcons();
	if (!raw) return config;
	reader.unknownKeys(raw, ['enabled', 'graphs', 'property', 'useFolderStyle', 'rules'], path);
	const property = typeof raw.property === 'string' && raw.property.trim() !== '' ? raw.property.trim() : config.property;
	if (raw.property !== undefined && property !== raw.property) reader.warn(`${path}.property`);
	return {
		enabled: reader.bool(raw, 'enabled', config.enabled, path),
		graphs: reader.graphs(raw, config.graphs, path),
		property,
		useFolderStyle: reader.bool(raw, 'useFolderStyle', config.useFolderStyle, path),
		rules: reader.rules(raw, 'rules', readIconEffect, path),
	};
}
