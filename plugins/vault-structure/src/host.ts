import type { Plugin } from 'obsidian';
import type { RulesFile } from './rules/rules-file';
import type { VaultStructureSettings } from './types';

/** What the feature modules need from the plugin. */
export interface StructureHost extends Plugin {
	settings: VaultStructureSettings;
	rules: RulesFile;
}
