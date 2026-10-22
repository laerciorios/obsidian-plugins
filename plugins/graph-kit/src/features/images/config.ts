import { isRecord } from '../../config/reader';
import type { Raw, Reader } from '../../config/reader';
import type { FeatureConfigBase } from '../../config/types';
import type { Rule } from '../../rules/types';

/** Rule effect: other properties (empty = the default list), a fixed image, or no image. */
export type ImageEffect = { properties: string[] } | { image: string } | { none: true };

export interface ImagesConfig extends FeatureConfigBase {
	/** Priority order: the first with an image wins. */
	properties: string[];
	/** Off (default): only images in the vault, no network. */
	allowRemote: boolean;
	/** Larger files are skipped. */
	maxFileSizeKb: number;
	/** Images are scaled down to this square, in pixels, before reaching the GPU. */
	textureSize: number;
	rules: Rule<ImageEffect>[];
}

export const MAX_FILE_SIZE_RANGE = { min: 16, max: 51200 };
export const TEXTURE_SIZE_RANGE = { min: 32, max: 512 };

export function defaultImages(): ImagesConfig {
	return { enabled: false, graphs: { global: true, local: true }, properties: ['cover'], allowRemote: false, maxFileSizeKb: 2048, textureSize: 128, rules: [] };
}

export function readImageEffect(value: unknown): ImageEffect | null {
	if (!isRecord(value)) return null;
	if (value.none === true) return { none: true };
	if (typeof value.image === 'string') return { image: value.image.trim() };
	if (!Array.isArray(value.properties)) return null;
	const properties: string[] = [];
	for (const item of value.properties) if (typeof item === 'string' && item.trim() !== '' && !properties.includes(item.trim())) properties.push(item.trim());
	return { properties };
}

export function readImages(raw: Raw | null, reader: Reader, path: string): ImagesConfig {
	const config = defaultImages();
	if (!raw) return config;
	reader.unknownKeys(raw, ['enabled', 'graphs', 'properties', 'allowRemote', 'maxFileSizeKb', 'textureSize', 'rules'], path);
	return {
		enabled: reader.bool(raw, 'enabled', config.enabled, path),
		graphs: reader.graphs(raw, config.graphs, path),
		properties: reader.stringList(raw, 'properties', config.properties, path),
		allowRemote: reader.bool(raw, 'allowRemote', config.allowRemote, path),
		maxFileSizeKb: reader.integer(raw, 'maxFileSizeKb', config.maxFileSizeKb, MAX_FILE_SIZE_RANGE, path),
		textureSize: reader.integer(raw, 'textureSize', config.textureSize, TEXTURE_SIZE_RANGE, path),
		rules: reader.rules(raw, 'rules', readImageEffect, path),
	};
}
