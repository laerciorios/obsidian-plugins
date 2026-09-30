import { setTooltip } from 'obsidian';
import { CLS } from '../constants';

/** The status bar item. Obsidian removes it when the plugin unloads. */
export class StatusBar {
	constructor(private readonly el: HTMLElement) {
		el.addClass(CLS.status);
		el.hide();
	}

	show(text: string, tooltip: string): void {
		this.el.setText(text);
		setTooltip(this.el, tooltip, { placement: 'top' });
		this.el.show();
	}

	hide(): void {
		this.el.hide();
	}
}
