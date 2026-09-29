import { Notice, Plugin } from 'obsidian';
import { HOVER_SOURCE, VIEW_TYPE } from './constants';
import { t } from './i18n';
import { BoardView } from './view/board-view';
import { getViewOptions } from './view/options';

export default class BasesBoardPlugin extends Plugin {
	onload(): void {
		this.registerHoverLinkSource(HOVER_SOURCE, { display: 'Bases Board', defaultMod: true });

		const registered = this.registerBasesView(VIEW_TYPE, {
			name: t('view.name'),
			icon: 'lucide-kanban',
			factory: (controller, containerEl) => new BoardView(controller, containerEl),
			options: getViewOptions,
		});

		if (!registered) {
			new Notice(t('notice.basesDisabled'));
		}
	}
}
