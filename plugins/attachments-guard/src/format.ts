import { locale, t } from './i18n';

export const BYTES_PER_MB = 1024 * 1024;

/** 12_900_000 → "12.3 MB" ("12,3 MB" in Portuguese); small files in KB. */
export function formatSize(bytes: number): string {
	const number = new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 });
	if (bytes >= BYTES_PER_MB) return t('size.mb', { value: number.format(bytes / BYTES_PER_MB) });
	return t('size.kb', { value: number.format(Math.max(1, Math.round(bytes / 1024))) });
}
