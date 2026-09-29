// Bump a plugin version: pnpm bump <id> <x.y.z>
// Updates package.json, manifest.json and versions.json (version -> minAppVersion).
import { join } from 'node:path';
import { assertPlugin, fail, pluginDir, readJson, writeJson } from './lib.mjs';

const [id, version] = process.argv.slice(2);
assertPlugin(id);
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) fail('Uso: pnpm bump <id> <x.y.z>');

const dir = pluginDir(id);
const manifest = readJson(join(dir, 'manifest.json'));
const pkg = readJson(join(dir, 'package.json'));
const versions = readJson(join(dir, 'versions.json'), {});

manifest.version = version;
pkg.version = version;
if (!(version in versions)) versions[version] = manifest.minAppVersion;

writeJson(join(dir, 'manifest.json'), manifest);
writeJson(join(dir, 'package.json'), pkg);
writeJson(join(dir, 'versions.json'), versions);

console.log(`✔ ${id} → ${version} (minAppVersion ${manifest.minAppVersion})`);
console.log(`  Próximo: pnpm --filter ${id} build && git commit -am "${id}: ${version}" && git tag ${id}-${version}`);
