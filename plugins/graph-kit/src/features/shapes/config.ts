import { isRecord } from '../../config/reader';
import type { Raw, Reader } from '../../config/reader';
import type { FeatureConfigBase } from '../../config/types';
import type { Rule } from '../../rules/types';
import { SHAPES } from './geometry';
import type { Shape } from './geometry';

export interface ShapeEffect {
	shape: Shape;
}

export interface ShapesConfig extends FeatureConfigBase {
	rules: Rule<ShapeEffect>[];
}

export function defaultShapes(): ShapesConfig {
	return { enabled: false, graphs: { global: true, local: true }, rules: [] };
}

export function readShapeEffect(value: unknown): ShapeEffect | null {
	if (!isRecord(value)) return null;
	const shape = SHAPES.find((option) => option === value.shape);
	return shape ? { shape } : null;
}

export function readShapes(raw: Raw | null, reader: Reader, path: string): ShapesConfig {
	const config = defaultShapes();
	if (!raw) return config;
	reader.unknownKeys(raw, ['enabled', 'graphs', 'rules'], path);
	return {
		enabled: reader.bool(raw, 'enabled', config.enabled, path),
		graphs: reader.graphs(raw, config.graphs, path),
		rules: reader.rules(raw, 'rules', readShapeEffect, path),
	};
}
