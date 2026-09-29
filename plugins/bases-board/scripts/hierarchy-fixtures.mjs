// Manual-test fixtures for the Bases Board card hierarchy (project → spec → task):
//   pnpm --filter bases-board fixtures:hierarchy
// Rewrites the generated folders under dev-vault/Hierarchy Lab/ (Projects, Stress)
// with dates relative to the local "today", and upserts the "hierarchy" profile in
// dev-vault/.obsidian/plugins/bases-board/data.json, keeping every other profile.
// The committed files Hierarchy Lab/index.md and Hierarchy Lab/hierarchy.base are
// never touched. The stress set comes from a seeded PRNG, so every run writes the
// same notes (only the dates move with today). All data is fictional.
// Plain Node 22, no dependencies.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---- paths -----------------------------------------------------------------

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DEV = join(ROOT, 'dev-vault');
const LAB_VAULT = 'Hierarchy Lab';
const LAB = join(DEV, LAB_VAULT);
const DATA_JSON = join(DEV, '.obsidian', 'plugins', 'bases-board', 'data.json');

/** Folders owned by this script. Everything else in LAB is committed. */
const GENERATED = ['Projects', 'Stress'];
const COMMITTED = ['index.md', 'hierarchy.base'];

function fail(message) {
	console.error(`✖ ${message}`);
	process.exit(1);
}

if (!existsSync(join(ROOT, 'pnpm-workspace.yaml')) || !existsSync(DEV)) {
	fail(`Repo root not found (resolved to ${ROOT}).`);
}

/** Refuse to touch anything that is not strictly inside LAB, or a committed file. */
function assertInsideLab(target) {
	const rel = relative(LAB, resolve(target));
	if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
		fail(`Refusing to delete a path outside ${LAB}: ${target}`);
	}
	if (COMMITTED.includes(rel)) fail(`Refusing to delete a committed file: ${target}`);
}

// ---- dates (local time) ----------------------------------------------------

const pad = (n, width = 2) => String(n).padStart(width, '0');

/** Local `YYYY-MM-DD`, n days before today (computed at noon, DST-safe). */
function daysAgo(n) {
	const date = new Date();
	date.setDate(date.getDate() - n);
	date.setHours(12, 0, 0, 0);
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ---- seeded PRNG (stress set) ----------------------------------------------

/** mulberry32: small deterministic PRNG, floats in [0, 1). */
function mulberry32(seed) {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const SEED = 20260929;
const rng = mulberry32(SEED);
const randInt = (min, max) => min + Math.floor(rng() * (max - min + 1));
const pick = (items) => items[Math.floor(rng() * items.length)];

function shuffle(items) {
	for (let i = items.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[items[i], items[j]] = [items[j], items[i]];
	}
	return items;
}

// ---- links -----------------------------------------------------------------

const quote = (text) => JSON.stringify(text);

/** Vault path of a note, without ".md". */
const vaultPath = (note) => `${LAB_VAULT}/${note.folder}/${note.file}`;

/** Full-path link with the title as alias. */
const fullLink = (card) => `[[${vaultPath(card)}|${card.title}]]`;

/** Short link by basename (basenames are unique in the vault). */
const shortLink = (card) => `[[${card.file}]]`;

const projectLink = (project) => `[[${vaultPath(project)}|${project.slug}]]`;

// ---- main scenario (fictional) ---------------------------------------------

const PROJECTS = {
	horta: {
		name: 'Horta Vertical',
		slug: 'horta-vertical',
		body: 'Projeto fictício do laboratório de hierarquia: uma parede de vasos com irrigação automática e sensores.',
	},
	estufa: {
		name: 'Estufa Modular',
		slug: 'estufa-modular',
		body: 'Projeto fictício do laboratório de hierarquia: uma estufa desmontável com cobertura retrátil.',
	},
};
for (const project of Object.values(PROJECTS)) {
	project.folder = `Projects/${project.name}`;
	project.file = 'index';
}

const tasksOf = (key) => `${PROJECTS[key].folder}/_Tasks`;

/**
 * Cards of the main scenario, in the order the files are written. `project` is
 * a PROJECTS key or null (empty `project:`); `parent` and `blockedBy` refer to
 * other cards by `key`, with `short: true` for a `[[basename]]` link, or to a
 * note that does not exist with `missing`. `created`/`completed` are days ago.
 */
const MAIN_CARDS = [
	// Horta Vertical, spec A: 5 active children written in an order different
	// from their `order` values (4, 2, empty, 3, 5) plus 1 archived child (order 1).
	{
		key: 'specA', folder: tasksOf('horta'), file: 'spec-irrigacao-automatica',
		title: 'Spec: irrigação automática', type: 'spec', status: 'doing', project: 'horta', created: 21,
		context: 'Spec A do cenário principal: 6 filhos diretos (5 ativos e 1 arquivado), barra 2/6 com arquivados e lista recolhida porque passa de 5 linhas.',
		todo: 'Automatizar a rega da parede de vasos com bomba, válvulas e controlador.',
	},
	{
		key: 'valvulas', folder: tasksOf('horta'), file: 'instalar-as-valvulas-solenoides',
		title: 'Instalar as válvulas solenoides', type: 'task', status: 'todo', project: 'horta',
		parent: { key: 'specA' }, order: 4, blockedBy: [{ key: 'tubulacao', short: true }], created: 14,
		context: 'Filho da spec A com order 4. Bloqueado por "Passar a tubulação principal" (link curto), que não está done: mostra o cadeado.',
		todo: 'Instalar uma válvula solenoide em cada ramal da parede.',
	},
	{
		key: 'tubulacao', folder: tasksOf('horta'), file: 'passar-a-tubulacao-principal',
		title: 'Passar a tubulação principal', type: 'task', status: 'doing', project: 'horta',
		parent: { key: 'specA' }, order: 2, created: 13,
		context: 'Filho da spec A com order 2. É o bloqueio de "Instalar as válvulas solenoides": mude para done e o cadeado de lá some.',
		todo: 'Passar o cano de 25 mm do reservatório até o topo da parede.',
	},
	{
		key: 'esquema', folder: tasksOf('horta'), file: 'documentar-o-esquema-hidraulico',
		title: 'Documentar o esquema hidráulico', type: 'task', status: 'review', project: 'horta',
		parent: { key: 'specA', short: true }, order: null, created: 12,
		context: 'Filho da spec A sem order: fica por último na lista. O parent é um link curto ([[spec-irrigacao-automatica]]).',
		todo: 'Desenhar o esquema com bomba, reservatório, ramais e válvulas.',
	},
	{
		key: 'pressao', folder: tasksOf('horta'), file: 'testar-a-pressao-da-bomba',
		title: 'Testar a pressão da bomba', type: 'task', status: 'done', project: 'horta',
		parent: { key: 'specA' }, order: 3, created: 11, completed: 4,
		context: 'Filho da spec A com order 3, done há 4 dias. É o bloqueio (já resolvido) de "Programar o controlador de rega".',
		todo: 'Medir a pressão no ramal mais alto com a bomba ligada.',
	},
	{
		key: 'controlador', folder: tasksOf('horta'), file: 'programar-o-controlador-de-rega',
		title: 'Programar o controlador de rega', type: 'task', status: 'todo', project: 'horta',
		parent: { key: 'specA' }, order: 5, blockedBy: [{ key: 'pressao' }], created: 10,
		context: 'Filho da spec A com order 5. Bloqueado por "Testar a pressão da bomba" (link completo), que está done: sem cadeado.',
		todo: 'Programar dois ciclos de rega por dia no controlador.',
	},
	{
		key: 'bombaArquivada', folder: `${tasksOf('horta')}/Archived`, file: 'escolher-o-modelo-de-bomba',
		title: 'Escolher o modelo de bomba', type: 'task', status: 'done', project: 'horta',
		parent: { key: 'specA' }, order: 1, created: 212, completed: 200,
		context: 'Filho da spec A com order 1, já arquivado há 200 dias. Conta e aparece esmaecido na lista só com "contar arquivados" ligado.',
		todo: 'Comparar três bombas submersas pela vazão e pelo consumo.',
	},
	// Horta Vertical, spec B: 2 children, one of them inherits the project.
	{
		key: 'specB', folder: tasksOf('horta'), file: 'spec-painel-de-sensores',
		title: 'Spec: painel de sensores', type: 'spec', status: 'todo', project: 'horta', created: 9,
		context: 'Spec B do cenário principal: 2 filhos, barra 1/2 e lista aberta.',
		todo: 'Montar um painel com sensores de umidade e de luz para a parede.',
	},
	{
		key: 'umidade', folder: tasksOf('horta'), file: 'soldar-os-sensores-de-umidade',
		title: 'Soldar os sensores de umidade', type: 'task', status: 'todo', project: 'horta',
		parent: { key: 'specB' }, order: 2, created: 8,
		context: 'Filho da spec B com order 2.',
		todo: 'Soldar os seis sensores de umidade nos cabos do painel.',
	},
	{
		key: 'luminosidade', folder: tasksOf('horta'), file: 'calibrar-o-sensor-de-luminosidade',
		title: 'Calibrar o sensor de luminosidade', type: 'task', status: 'done', project: null,
		parent: { key: 'specB' }, order: 1, created: 7, completed: 2,
		context: 'Filho da spec B com order 1, done há 2 dias e com project vazio: herda o projeto Horta Vertical da spec B.',
		todo: 'Ajustar a leitura do sensor de luz com um luxímetro emprestado.',
	},
	// Horta Vertical, tasks without a parent.
	{
		key: 'estrutura', folder: tasksOf('horta'), file: 'pintar-a-estrutura-metalica',
		title: 'Pintar a estrutura metálica', type: 'task', status: 'doing', project: 'horta', created: 6,
		context: 'Tarefa solta do projeto (sem parent): conta como tarefa do projeto e não mostra o chip ↑.',
		todo: 'Aplicar fundo anticorrosivo e duas demãos de tinta na estrutura.',
	},
	{
		key: 'substrato', folder: tasksOf('horta'), file: 'comprar-o-substrato-de-fibra-de-coco',
		title: 'Comprar o substrato de fibra de coco', type: 'task', status: 'todo', project: 'horta',
		blockedBy: [{ missing: 'nota-que-nao-existe' }], created: 5,
		context: 'Tarefa solta do projeto, bloqueada por um link para uma nota que não existe: o link é ignorado e não há cadeado.',
		todo: 'Comprar dez sacos de fibra de coco para os vasos.',
	},
	// Estufa Modular: 1 spec, 2 tasks, all todo.
	{
		key: 'specE', folder: tasksOf('estufa'), file: 'spec-cobertura-retratil',
		title: 'Spec: cobertura retrátil', type: 'spec', status: 'todo', project: 'estufa', created: 4,
		context: 'Spec do segundo projeto: 2 filhos em todo, barra 0/2.',
		todo: 'Projetar uma cobertura de lona que abre e fecha por manivela.',
	},
	{
		key: 'perfis', folder: tasksOf('estufa'), file: 'cortar-os-perfis-de-aluminio',
		title: 'Cortar os perfis de alumínio', type: 'task', status: 'todo', project: 'estufa',
		parent: { key: 'specE' }, order: 1, created: 3,
		context: 'Filho da spec da Estufa Modular com order 1.',
		todo: 'Cortar os perfis dos arcos da cobertura no tamanho do projeto.',
	},
	{
		key: 'lona', folder: tasksOf('estufa'), file: 'costurar-a-lona-da-cobertura',
		title: 'Costurar a lona da cobertura', type: 'task', status: 'todo', project: 'estufa',
		parent: { key: 'specE' }, order: 2, created: 2,
		context: 'Filho da spec da Estufa Modular com order 2.',
		todo: 'Costurar as bainhas da lona para passar os arcos.',
	},
];

// ---- stress set (fictional, seeded) ----------------------------------------

const STRESS_PROJECTS = [
	{ name: 'Pomar Comunitário', slug: 'pomar-comunitario' },
	{ name: 'Cisterna Escolar', slug: 'cisterna-escolar' },
	{ name: 'Composteira de Bairro', slug: 'composteira-de-bairro' },
	{ name: 'Apiário Urbano', slug: 'apiario-urbano' },
	{ name: 'Minhocário Didático', slug: 'minhocario-didatico' },
];
const SPECS_PER_PROJECT = 4;
const TASKS_PER_SPEC = 25;
const BLOCKED_RATIO = 0.1;
const PHASES = ['levantamento', 'compras', 'montagem', 'operação'];
const STATUSES = ['todo', 'doing', 'review', 'done'];
const ACTIONS = [
	'medir o terreno', 'comprar as ferramentas', 'limpar a área', 'montar a estrutura', 'testar a vazão',
	'pintar os suportes', 'revisar o orçamento', 'fotografar o andamento', 'conferir as medidas', 'trocar as peças gastas',
	'ajustar os parafusos', 'registrar as leituras', 'organizar o mutirão', 'avisar os vizinhos', 'separar os materiais',
	'lixar as bordas', 'calibrar a balança', 'etiquetar as caixas', 'regar as mudas', 'desenhar a planta baixa',
];

/** Build the stress projects and cards. Consumes the PRNG in a fixed order. */
function buildStress() {
	const projects = [];
	const cards = [];
	for (const base of STRESS_PROJECTS) {
		const project = {
			...base,
			folder: `Stress/${base.name}`,
			file: 'index',
			body: 'Projeto fictício do teste de carga da hierarquia, gerado com semente fixa.',
		};
		projects.push(project);
		const folder = `${project.folder}/_Tasks`;
		for (let s = 1; s <= SPECS_PER_PROJECT; s++) {
			const specStatus = pick(STATUSES);
			const spec = {
				folder, file: `${project.slug}-spec-${s}`,
				title: `Spec: ${PHASES[s - 1]} (${project.name})`, type: 'spec', status: specStatus,
				projectRef: project, created: randInt(61, 90), completed: specStatus === 'done' ? randInt(1, 10) : null,
				context: 'Spec gerada para o teste de carga da hierarquia (25 filhos).',
			};
			cards.push(spec);
			const orders = shuffle(Array.from({ length: TASKS_PER_SPEC }, (_, i) => i + 1));
			const tasks = [];
			for (let n = 1; n <= TASKS_PER_SPEC; n++) {
				const status = pick(STATUSES);
				tasks.push({
					folder, file: `${spec.file}-tarefa-${pad(n)}`,
					title: `Tarefa ${pad(n)}: ${pick(ACTIONS)}`, type: 'task', status,
					projectRef: project, parentRef: spec, order: orders[n - 1],
					created: randInt(11, 60), completed: status === 'done' ? randInt(1, 10) : null,
					context: 'Tarefa gerada para o teste de carga da hierarquia.',
				});
			}
			for (const [index, task] of tasks.entries()) {
				if (rng() >= BLOCKED_RATIO) continue;
				let other = randInt(0, TASKS_PER_SPEC - 2);
				if (other >= index) other++;
				task.blockerRefs = [tasks[other]];
			}
			cards.push(...tasks);
		}
	}
	return { projects, cards };
}

// ---- writers ---------------------------------------------------------------

/** Write a note under LAB (UTF-8, LF). */
function writeNote(note, content) {
	const path = join(LAB, `${note.folder}/${note.file}.md`);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, content.replace(/\r\n/g, '\n'), 'utf8');
}

function projectNote(project) {
	return [
		'---',
		`title: ${quote(project.name)}`,
		'type: project',
		'status: active',
		`slug: ${project.slug}`,
		`aliases: [${quote(project.name)}, ${quote(project.slug)}]`,
		'tags: [project]',
		'---',
		`# ${project.name}`,
		'',
		project.body,
		'',
		'## Cards',
		'',
		'Os cards ficam em `_Tasks/`; os arquivados, em `_Tasks/Archived/`.',
		'',
	].join('\n');
}

/**
 * A card note. Expects resolved links: `projectLink`, `parentLink` ('' = none)
 * and `blockedByLinks` (list of link texts).
 */
function cardNote(card) {
	const blockedBy =
		card.blockedByLinks.length === 0
			? ['blocked_by: []']
			: ['blocked_by:', ...card.blockedByLinks.map((link) => `  - ${quote(link)}`)];
	const body = card.todo
		? ['## Contexto', '', card.context, '', '## O que fazer', '', card.todo, '', '## Notas de execução', '', '']
		: ['## Contexto', '', card.context, ''];
	return [
		'---',
		`title: ${quote(card.title)}`,
		`type: ${card.type}`,
		`status: ${card.status}`,
		`project: ${quote(card.projectLink)}`,
		`parent: ${quote(card.parentLink)}`,
		card.order === null || card.order === undefined ? 'order:' : `order: ${card.order}`,
		...blockedBy,
		'executor: me',
		`created: ${daysAgo(card.created)}`,
		'due:',
		card.completed === null || card.completed === undefined ? 'completed:' : `completed: ${daysAgo(card.completed)}`,
		'tags: [card]',
		'---',
		...body,
	].join('\n');
}

// ---- settings --------------------------------------------------------------

const PROFILE = {
	id: 'hierarchy',
	name: 'Hierarquia',
	cardTag: 'card',
	includeFolders: ['Hierarchy Lab'],
	excludeFolders: ['_Templates'],
	statusProperty: 'status',
	doneValue: 'done',
	completedProperty: 'completed',
	completedFormat: 'date',
	projectProperty: 'project',
	parentProperty: 'parent',
	orderProperty: 'order',
	blockedByProperty: 'blocked_by',
	typeProperty: 'type',
	hierarchy: {
		enabled: true,
		countArchived: true,
		collapseAbove: 5,
		showOnProjects: true,
		specValue: 'spec',
	},
	archive: {
		enabled: false,
		afterDays: 30,
		folderPattern: '{cardFolder}/Archived',
		missingCompleted: 'skip',
		recordOriginProperty: '',
	},
	newCard: {
		folderPattern: '{projectFolder}/_Tasks',
		fallbackFolder: '',
		fileNamePattern: '{date:YYYY-MM-DD}-{slug}',
		templatePath: '_Templates/card.md',
		defaultType: 'task',
	},
};

/** Stored settings, or a minimal default when data.json is missing or unparsable. */
function readSettings() {
	try {
		const data = JSON.parse(readFileSync(DATA_JSON, 'utf8'));
		if (data && typeof data === 'object' && !Array.isArray(data)) return data;
	} catch {
		// Missing or unparsable: start over below.
	}
	return { profiles: [{ id: 'default' }] };
}

/** Replace the hierarchy profile, keep everything else. Returns the profile count. */
function upsertProfile() {
	const settings = readSettings();
	const others = Array.isArray(settings.profiles) ? settings.profiles.filter((profile) => profile?.id !== PROFILE.id) : [];
	// The first profile is the plugin's default: never let the hierarchy one take that slot.
	settings.profiles = [...(others.length > 0 ? others : [{ id: 'default' }]), PROFILE];
	mkdirSync(dirname(DATA_JSON), { recursive: true });
	writeFileSync(DATA_JSON, JSON.stringify(settings, null, '\t') + '\n', 'utf8');
	return settings.profiles.length;
}

// ---- run -------------------------------------------------------------------

mkdirSync(LAB, { recursive: true });
for (const name of GENERATED) {
	const target = join(LAB, name);
	assertInsideLab(target);
	rmSync(target, { recursive: true, force: true });
}

// Main scenario
const byKey = new Map(MAIN_CARDS.map((card) => [card.key, card]));
const refLink = (ref) => {
	if (ref.missing) return `[[${ref.missing}]]`;
	const target = byKey.get(ref.key);
	if (!target) fail(`Unknown card key: ${ref.key}`);
	return ref.short ? shortLink(target) : fullLink(target);
};

for (const project of Object.values(PROJECTS)) writeNote(project, projectNote(project));
for (const card of MAIN_CARDS) {
	card.projectLink = card.project ? projectLink(PROJECTS[card.project]) : '';
	card.parentLink = card.parent ? refLink(card.parent) : '';
	card.blockedByLinks = (card.blockedBy ?? []).map(refLink);
	writeNote(card, cardNote(card));
}

// Stress set
const stress = buildStress();
for (const project of stress.projects) writeNote(project, projectNote(project));
for (const card of stress.cards) {
	card.projectLink = projectLink(card.projectRef);
	card.parentLink = card.parentRef ? fullLink(card.parentRef) : '';
	card.blockedByLinks = (card.blockerRefs ?? []).map(fullLink);
	writeNote(card, cardNote(card));
}

const profileCount = upsertProfile();

// ---- summary ---------------------------------------------------------------

/** Markdown files per folder, relative to the vault root. */
function countNotes(dir, counts = new Map()) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) countNotes(path, counts);
		else if (entry.name.endsWith('.md')) {
			const folder = relative(DEV, dir).split(sep).join('/');
			counts.set(folder, (counts.get(folder) ?? 0) + 1);
		}
	}
	return counts;
}

const counts = new Map();
for (const name of GENERATED) {
	if (existsSync(join(LAB, name))) countNotes(join(LAB, name), counts);
}
const total = [...counts.values()].reduce((sum, n) => sum + n, 0);

const stressTasks = stress.cards.filter((card) => card.type === 'task');
const stressSpecs = stress.cards.filter((card) => card.type === 'spec');
const byStatus = (cards) => STATUSES.map((status) => `${status} ${cards.filter((card) => card.status === status).length}`).join(', ');
const blocked = stressTasks.filter((card) => card.blockerRefs);
const locked = blocked.filter((card) => card.blockerRefs.some((blocker) => blocker.status !== 'done'));

console.log(`✔ Hierarchy Lab fixtures generated (today: ${daysAgo(0)}), ${total} notes:`);
for (const [folder, n] of [...counts].sort(([a], [b]) => a.localeCompare(b))) {
	console.log(`    ${folder}: ${n}`);
}
console.log(`✔ Main scenario: ${Object.keys(PROJECTS).length} projects, ${MAIN_CARDS.length} cards (1 already archived).`);
console.log(
	`✔ Stress set (seed ${SEED}): ${stress.projects.length} projects, ${stressSpecs.length} specs, ${stressTasks.length} tasks` +
		` = ${stress.cards.length} cards.`,
);
console.log(`    specs: ${byStatus(stressSpecs)}`);
console.log(`    tasks: ${byStatus(stressTasks)}`);
console.log(`    tasks with blocked_by: ${blocked.length}, expected locks (blocker not done): ${locked.length}`);
console.log(`✔ Profile "${PROFILE.id}" written: ${relative(ROOT, DATA_JSON)} (${profileCount} profiles, others kept)`);
for (const file of COMMITTED) {
	if (!existsSync(join(LAB, file))) console.log(`• Missing committed file: ${LAB_VAULT}/${file}`);
}
console.log('• If Obsidian is open on dev-vault, the plugin reloads its settings when data.json changes on disk; otherwise reopen the vault.');
