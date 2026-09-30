import type { moment } from 'obsidian';

const VARIABLE = /\{\{\s*(title|date|time)\s*(?::([^}]*))?\}\}/gi;

export interface TemplateValues {
	/** `{{title}}`: the name of the new note. */
	title: string;
	/** Moment behind `{{date}}` and `{{time}}`. */
	date: moment.Moment;
	/** Format of a bare `{{date}}`. The Templates plugin uses YYYY-MM-DD; Daily notes, the daily note format. */
	dateFormat?: string;
	/** Format of a bare `{{time}}`. */
	timeFormat?: string;
}

/**
 * The variables of the core Templates and Daily notes plugins: `{{title}}`,
 * `{{date}}`, `{{time}}`, `{{date:FORMAT}}` and `{{time:FORMAT}}` (moment formats).
 */
export function fillTemplate(template: string, values: TemplateValues): string {
	const defaults: Record<string, string> = {
		date: values.dateFormat || 'YYYY-MM-DD',
		time: values.timeFormat || 'HH:mm',
	};
	return template.replace(VARIABLE, (_match, name: string, format: string | undefined) => {
		const variable = name.toLowerCase();
		if (variable === 'title') return values.title;
		return values.date.format(format?.trim() || defaults[variable]);
	});
}
