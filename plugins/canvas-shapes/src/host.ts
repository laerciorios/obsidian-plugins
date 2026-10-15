import type { App } from 'obsidian';
import type { ShapesController } from './canvas/controller';
import type { CanvasShapesSettings } from './settings';

/** What the feature modules need from the plugin. */
export interface PluginHost {
	app: App;
	settings: CanvasShapesSettings;
	shapes: ShapesController;
	saveSettings(): Promise<void>;
}
