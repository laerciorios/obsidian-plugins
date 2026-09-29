import type { App, BasesEntry } from 'obsidian';
import { LOCKED_TYPES } from '../constants';
import type { Graph } from '../hierarchy/graph';
import { relationsOf } from '../hierarchy/relations';
import type { BoardConfig, CardModel, Column } from '../types';
import { dateIsoOf, linkTargetOf, todayIso, valueText } from './values';

export function toCardModel(app: App, entry: BasesEntry, cfg: BoardConfig, column: Column, graph: Graph | null): CardModel {
	const text = (prop: typeof cfg.titleProperty): string => (prop ? valueText(entry.getValue(prop)) : '');

	const type = text(cfg.typeProperty) || null;
	const due = cfg.dueProperty ? dateIsoOf(app, entry, cfg.dueProperty) : null;

	return {
		path: entry.file.path,
		title: text(cfg.titleProperty) || entry.file.basename,
		type,
		project: cfg.projectProperty ? linkTargetOf(app, entry, cfg.projectProperty) : null,
		isAi: cfg.executorProperty !== null && text(cfg.executorProperty) === cfg.aiValue,
		due,
		isOverdue: due !== null && due < todayIso() && !column.isDone,
		draggable: cfg.columnWritable && !(type !== null && LOCKED_TYPES.has(type)),
		relations: graph ? relationsOf(graph, entry.file.path, cfg.hierarchy) : null,
	};
}
