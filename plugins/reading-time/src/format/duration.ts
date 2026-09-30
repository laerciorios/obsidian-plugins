import { t } from '../i18n';
import type { MessageKey } from '../i18n';
import type { FormatId } from '../types';

export type PresetFormat = Exclude<FormatId, 'custom'>;

type Unit = 'hour' | 'minute' | 'second';

interface Part {
	unit: Unit;
	value: number;
}

const SHORT: Record<Unit, MessageKey> = {
	hour: 'unit.hour.short',
	minute: 'unit.minute.short',
	second: 'unit.second.short',
};

const LONG: Record<Unit, [MessageKey, MessageKey]> = {
	hour: ['unit.hour.one', 'unit.hour.other'],
	minute: ['unit.minute.one', 'unit.minute.other'],
	second: ['unit.second.one', 'unit.second.other'],
};

/** Hours, minutes and seconds that are not zero, largest first. */
function parts(seconds: number): Part[] {
	const all: Part[] = [
		{ unit: 'hour', value: Math.floor(seconds / 3600) },
		{ unit: 'minute', value: Math.floor((seconds % 3600) / 60) },
		{ unit: 'second', value: seconds % 60 },
	];
	return all.filter((part) => part.value > 0);
}

const short = (part: Part): string => t(SHORT[part.unit], { n: part.value });
const long = (part: Part): string => t(LONG[part.unit][part.value === 1 ? 0 : 1], { n: part.value });
const pad = (value: number): string => String(value).padStart(2, '0');

const ZERO: Part = { unit: 'second', value: 0 };

/** "10 min": whole minutes, rounded up. */
export function formatMinutes(seconds: number): string {
	return t('format.minutes', { n: Math.ceil(seconds / 60) });
}

/** "10m": the largest unit only; "1h 2m" from one hour on. */
export function formatCompact(seconds: number): string {
	const list = parts(seconds);
	const first = list[0] ?? ZERO;
	return (first.unit === 'hour' ? list.slice(0, 2) : [first]).map(short).join(' ');
}

/** "10m 4s". */
export function formatSimple(seconds: number): string {
	const list = parts(seconds);
	return (list.length > 0 ? list : [ZERO]).map(short).join(' ');
}

/** "10 minutes 4 seconds". */
export function formatVerbose(seconds: number): string {
	const list = parts(seconds);
	return (list.length > 0 ? list : [ZERO]).map(long).join(' ');
}

/** "10:04", "1:02:03". */
export function formatClock(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export const FORMATTERS: Record<PresetFormat, (seconds: number) => string> = {
	minutes: formatMinutes,
	compact: formatCompact,
	simple: formatSimple,
	verbose: formatVerbose,
	clock: formatClock,
};

export const PRESET_FORMATS = Object.keys(FORMATTERS) as PresetFormat[];
