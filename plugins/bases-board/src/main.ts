import { Notice, Plugin } from 'obsidian';
import { HOVER_SOURCE, VIEW_TYPE } from './constants';
import { BoardView } from './view/board-view';
import { getViewOptions } from './view/options';

export default class BasesBoardPlugin extends Plugin {
	onload(): void {
		this.registerHoverLinkSource(HOVER_SOURCE, { display: 'Bases Board', defaultMod: true });

		const registered = this.registerBasesView(VIEW_TYPE, {
			name: 'Board',
			icon: 'lucide-kanban',
			factory: (controller, containerEl) => new BoardView(controller, containerEl),
			options: getViewOptions,
		});

		if (!registered) {
			new Notice('Bases Board: ative o plugin principal Bases para usar a view Board.');
		}
	}
}
