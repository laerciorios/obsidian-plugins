// Shared helpers for the repo scripts (plain Node, no dependencies).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PLUGINS_DIR = join(ROOT, 'plugins');
export const DEV_VAULT = join(ROOT, 'dev-vault');
export const TARGETS_FILE = join(ROOT, '.dev-targets.json');

export const ID_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export function fail(message) {
	console.error(`✖ ${message}`);
	process.exit(1);
}

export function readJson(path, fallback) {
	if (!existsSync(path)) return fallback;
	return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path, data) {
	writeFileSync(path, JSON.stringify(data, null, '\t') + '\n');
}

export function expandHome(path) {
	return path.startsWith('~') ? join(homedir(), path.slice(1)) : path;
}

export function pluginDir(id) {
	return join(PLUGINS_DIR, id);
}

export function assertPlugin(id) {
	if (!id) fail('Informe o id do plugin.');
	if (!existsSync(join(pluginDir(id), 'manifest.json'))) {
		fail(`Plugin "${id}" não encontrado em plugins/.`);
	}
}

/** Vault plugin folders that receive a copy of the plugin build, besides the dev vault. */
export function readTargets() {
	return readJson(TARGETS_FILE, {});
}

export function writeTargets(targets) {
	writeJson(TARGETS_FILE, targets);
}

/** All folders a plugin build is copied to: the dev vault (always) + linked vaults. */
export function targetsFor(id) {
	const extra = readTargets()[id] ?? [];
	return [join(DEV_VAULT, '.obsidian', 'plugins', id), ...extra];
}
