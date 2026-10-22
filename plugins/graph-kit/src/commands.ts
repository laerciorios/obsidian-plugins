import { Notice } from 'obsidian';
import type { Plugin } from 'obsidian';
import type { FeatureId, GraphKitConfig } from './config/types';
import { FEATURE_IDS } from './features/registry';
import type { FeatureStatus } from './graph-host';
import { t } from './i18n';

export interface CommandHost extends Plugin {
	config: GraphKitConfig;
	featureStatus(id: FeatureId): FeatureStatus;
	configChanged(rerender?: boolean): void;
	openExport(): void;
	openImport(): void;
}

/** Command ids are stable API: `toggle-<feature>`, `disable-all`, `enable-all`, `export-config`, `import-config`. */
export function registerCommands(plugin: CommandHost): void {
	for (const id of FEATURE_IDS) {
		plugin.addCommand({
			id: `toggle-${id}`,
			name: t(`command.toggle.${id}`),
			callback: () => {
				const feature = plugin.config.features[id];
				const name = t(`feature.${id}.name`);
				if (!feature.enabled && plugin.featureStatus(id).state === 'unavailable') {
					new Notice(t('notice.unavailable', { feature: name }));
					return;
				}
				feature.enabled = !feature.enabled;
				plugin.configChanged(true);
				new Notice(t(feature.enabled ? 'notice.feature.on' : 'notice.feature.off', { feature: name }));
			},
		});
	}

	plugin.addCommand({
		id: 'disable-all',
		name: t('command.disableAll'),
		checkCallback: (checking) => {
			if (!plugin.config.enabled) return false;
			if (!checking) {
				plugin.config.enabled = false;
				plugin.configChanged(true);
				new Notice(t('notice.allOff'));
			}
			return true;
		},
	});
	plugin.addCommand({
		id: 'enable-all',
		name: t('command.enableAll'),
		checkCallback: (checking) => {
			if (plugin.config.enabled) return false;
			if (!checking) {
				plugin.config.enabled = true;
				plugin.configChanged(true);
				new Notice(t('notice.allOn'));
			}
			return true;
		},
	});
	plugin.addCommand({ id: 'export-config', name: t('command.export'), callback: () => plugin.openExport() });
	plugin.addCommand({ id: 'import-config', name: t('command.import'), callback: () => plugin.openImport() });
}
