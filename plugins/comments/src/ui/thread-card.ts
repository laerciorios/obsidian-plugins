import { MarkdownRenderer, moment, setIcon, setTooltip } from 'obsidian';
import type { App, Component } from 'obsidian';
import { CLS, DATE_FORMAT } from '../constants';
import { t } from '../i18n';
import type { Message, Thread } from '../model/format';
import { isAiAuthor } from '../model/threads';
import { sendKeyLabel } from './comment-modal';

export interface CardContext {
	app: App;
	/** Owns the rendered markdown; unloaded on the next render of the panel. */
	component: Component;
	/** Path the markdown of the comments file resolves its links from. */
	sourcePath: string;
	orphan: boolean;
	focused: boolean;
	replying: boolean;
	draft: string;
	goTo(): void;
	setStatus(status: Thread['status']): void;
	toggleReply(open: boolean): void;
	saveDraft(text: string): void;
	/** Resolves true when the reply was saved. */
	sendReply(body: string): Promise<boolean>;
}

function formatDate(date: string | null): string {
	if (!date) return '';
	const parsed = moment(date, [DATE_FORMAT, 'YYYY-MM-DD'], true);
	if (!parsed.isValid()) return date;
	return parsed.format(date.length > 10 ? 'lll' : 'll');
}

function renderMessage(parent: HTMLElement, message: Message, context: CardContext): void {
	const el = parent.createDiv({ cls: CLS.message });
	const header = el.createDiv({ cls: CLS.messageHeader });
	// "ia"/"ai" become the badge alone: the name would only repeat it.
	if (isAiAuthor(message.author)) header.createSpan({ cls: [CLS.badge, CLS.badgeAi], text: t('panel.ai') });
	else header.createSpan({ cls: CLS.author, text: message.author });
	if (message.date) {
		const date = header.createSpan({ cls: CLS.date, text: formatDate(message.date) });
		setTooltip(date, message.date);
	}
	if (message.quote) el.createDiv({ cls: CLS.messageQuote, text: message.quote });
	const body = el.createDiv({ cls: [CLS.body, 'markdown-rendered'] });
	void MarkdownRenderer.render(context.app, message.body, body, context.sourcePath, context.component);
}

function button(parent: HTMLElement, text: string, onClick: () => void, cta = false): HTMLButtonElement {
	const el = parent.createEl('button', { text, cls: cta ? 'mod-cta' : undefined });
	el.onClickEvent((event) => {
		event.stopPropagation();
		onClick();
	});
	return el;
}

/** Reply boxes on screen and how to send each: Mod+Enter reaches them through the panel's scope. */
const senders = new WeakMap<HTMLElement, () => void>();

/** Send the reply box that has the focus; false when none has. */
export function sendFocusedReply(focused: Element | null): boolean {
	const send = focused instanceof HTMLElement ? senders.get(focused) : undefined;
	send?.();
	return send !== undefined;
}

function renderReply(parent: HTMLElement, context: CardContext): void {
	const el = parent.createDiv({ cls: CLS.reply });
	const input = el.createEl('textarea', {
		cls: CLS.input,
		attr: { rows: '3', placeholder: t('panel.replyPlaceholder'), 'aria-label': t('panel.replyPlaceholder') },
	});
	input.value = context.draft;
	el.createDiv({ cls: CLS.hint, text: t('modal.hint', { key: sendKeyLabel() }) });
	const actions = el.createDiv({ cls: CLS.actions });
	const send = async () => {
		const body = input.value.trim();
		if (!body) return;
		input.disabled = true;
		if (!(await context.sendReply(body))) input.disabled = false;
	};
	button(actions, t('panel.cancel'), () => context.toggleReply(false));
	button(actions, t('panel.send'), () => void send(), true);
	senders.set(input, () => void send());
	input.addEventListener('input', () => context.saveDraft(input.value));
	input.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') context.toggleReply(false);
	});
	if (context.focused || !context.draft) window.setTimeout(() => input.focus(), 0);
}

/** One conversation: quote, messages, reply box and actions. */
export function renderThread(parent: HTMLElement, thread: Thread, context: CardContext): HTMLElement {
	const resolved = thread.status === 'resolved';
	const card = parent.createDiv({ cls: CLS.thread });
	card.toggleClass(CLS.threadResolved, resolved);
	card.toggleClass(CLS.threadOrphan, context.orphan);
	card.toggleClass(CLS.threadFocused, context.focused);

	if (context.orphan || resolved) {
		const badges = card.createDiv({ cls: CLS.badges });
		if (context.orphan) {
			const badge = badges.createSpan({ cls: [CLS.badge, CLS.badgeOrphan], text: t('panel.orphan') });
			setTooltip(badge, t('panel.orphanDesc'));
		}
		if (resolved) badges.createSpan({ cls: [CLS.badge, CLS.badgeResolved], text: t('panel.resolvedBadge') });
	}

	const quote = card.createDiv({ cls: CLS.quote, text: thread.quote || t('panel.wholeBlock') });
	if (!context.orphan) {
		quote.addClass('is-clickable');
		quote.setAttr('role', 'button');
		quote.setAttr('tabindex', '0');
		setTooltip(quote, t('panel.goTo'));
		quote.onClickEvent(() => context.goTo());
		quote.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				context.goTo();
			}
		});
	}

	for (const message of thread.messages) renderMessage(card, message, context);

	if (context.replying) {
		renderReply(card, context);
	} else {
		const actions = card.createDiv({ cls: CLS.actions });
		if (!resolved) button(actions, t('panel.reply'), () => context.toggleReply(true));
		const toggle = button(actions, t(resolved ? 'panel.reopen' : 'panel.resolve'), () =>
			context.setStatus(resolved ? 'open' : 'resolved'),
		);
		setIcon(toggle.createSpan({ prepend: true }), resolved ? 'rotate-ccw' : 'check');
	}
	return card;
}
