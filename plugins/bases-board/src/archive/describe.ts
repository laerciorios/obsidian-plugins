import { t } from '../i18n';
import type { PatternError } from '../patterns/pattern';
import type { SkippedCard } from './planner';

export function describePatternError(error: PatternError): string {
	const token = error.token ?? '';
	switch (error.code) {
		case 'empty':
			return t('pattern.empty');
		case 'unclosed':
			return t('pattern.unclosed');
		case 'unknownToken':
			return t('pattern.unknownToken', { token });
		case 'notAllowed':
			return t('pattern.notAllowed', { token });
		case 'dateFormat':
			return t('pattern.dateFormat');
		case 'parentDir':
			return t('pattern.parentDir');
		case 'slash':
			return t('pattern.slash');
		case 'noLiteral':
			return t('pattern.noLiteral');
		case 'noCriteria':
			return t('pattern.noCriteria');
	}
}

export function describeSkip(skipped: SkippedCard): string {
	switch (skipped.reason) {
		case 'noCompleted':
			return t('skip.noCompleted', { property: skipped.profile.completedProperty });
		case 'invalidCompleted':
			return t('skip.invalidCompleted', { property: skipped.profile.completedProperty });
		case 'unresolved':
			return t('skip.unresolved', { token: `{${skipped.token ?? ''}}` });
		case 'sameFolder':
			return t('skip.sameFolder');
		case 'unrecognized':
			return t('skip.unrecognized');
		case 'limit':
			return t('skip.limit');
	}
}
