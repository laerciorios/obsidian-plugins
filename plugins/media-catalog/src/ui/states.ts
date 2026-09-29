import { ButtonComponent } from 'obsidian';
import { CLS } from '../constants';
import { t } from '../i18n';

/** Placeholder states of the results area (search and seasons). */

export function renderHint(parent: HTMLElement, text: string): HTMLElement {
	return parent.createDiv({ cls: [CLS.state, CLS.hint], text });
}

export function renderLoading(parent: HTMLElement, text: string): HTMLElement {
	const el = parent.createDiv({ cls: CLS.state, attr: { role: 'status', 'aria-live': 'polite' } });
	el.createSpan({ cls: CLS.spinner, attr: { 'aria-hidden': 'true' } });
	el.createSpan({ text });
	return el;
}

export function renderEmpty(parent: HTMLElement, text: string): HTMLElement {
	return parent.createDiv({ cls: CLS.state, text, attr: { role: 'status' } });
}

export function renderError(parent: HTMLElement, message: string, onRetry: () => void): HTMLElement {
	const el = parent.createDiv({ cls: [CLS.state, CLS.stateError], attr: { role: 'alert' } });
	el.createSpan({ text: message });
	new ButtonComponent(el).setButtonText(t('search.retry')).onClick(onRetry);
	return el;
}
