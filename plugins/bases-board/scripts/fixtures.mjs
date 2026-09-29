// Manual-test fixtures for Bases Board archiving and board profiles:
//   pnpm --filter bases-board fixtures
// Archiving depends on "completed N days ago", so the notes are regenerated with
// dates relative to the local "today" instead of being committed. Rewrites the
// generated folders under dev-vault/Archive Lab/ (Projects, Central, Broken,
// Boards) and resets dev-vault/.obsidian/plugins/bases-board/data.json.
// The committed files Archive Lab/index.md and Archive Lab/lab.base are never touched.
// All data is fictional. Plain Node 22, no dependencies.
import { existsSync, mkdirSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---- paths -----------------------------------------------------------------

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DEV = join(ROOT, 'dev-vault');
const LAB_VAULT = 'Archive Lab';
const LAB = join(DEV, LAB_VAULT);
const DATA_JSON = join(DEV, '.obsidian', 'plugins', 'bases-board', 'data.json');

/** Folders owned by this script. Everything else in LAB is committed. */
const GENERATED = ['Projects', 'Central', 'Broken', 'Boards'];

function fail(message) {
	console.error(`✖ ${message}`);
	process.exit(1);
}

if (!existsSync(join(ROOT, 'pnpm-workspace.yaml')) || !existsSync(DEV)) {
	fail(`Repo root not found (resolved to ${ROOT}).`);
}

/** Refuse to touch anything that is not strictly inside LAB. */
function assertInsideLab(target) {
	const rel = relative(LAB, resolve(target));
	if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
		fail(`Refusing to delete a path outside ${LAB}: ${target}`);
	}
}

// ---- dates (local time) ----------------------------------------------------

const pad = (n) => String(n).padStart(2, '0');

/** Local Date n days before today, at the given time (default noon, DST-safe). */
function dateAgo(n, hours = 12, minutes = 0) {
	const date = new Date();
	date.setDate(date.getDate() - n);
	date.setHours(hours, minutes, 0, 0);
	return date;
}

function formatDay(date) {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local `YYYY-MM-DD`, n days ago. */
function daysAgo(n) {
	return formatDay(dateAgo(n));
}

/** Local `YYYY-MM-DDTHH:mm`, n days ago (the plugin's "datetime" format). */
function daysAgoAt(n, time) {
	const [hours, minutes] = time.split(':').map(Number);
	const date = dateAgo(n, hours, minutes);
	return `${formatDay(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Same rule as the plugin's slugify: lowercase, no accents, words joined by "-". */
function slugify(text) {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

// ---- fixture data (fictional) ----------------------------------------------

const PROJECTS = {
	estufa: {
		name: 'Estufa Solar',
		slug: 'estufa-solar',
		body: 'Projeto fictício do laboratório de arquivamento: uma estufa comunitária aquecida por painéis solares.',
	},
	viveiro: {
		name: 'Viveiro Móvel',
		slug: 'viveiro-movel',
		body: 'Projeto fictício do laboratório de arquivamento: um reboque com prateleiras de mudas que visita escolas.',
	},
};

const projectFolder = (key) => `Projects/${PROJECTS[key].name}`;
const projectLink = (key) => `[[${LAB_VAULT}/${projectFolder(key)}/index|${PROJECTS[key].slug}]]`;

/**
 * Cards. `folder` is relative to LAB. `completed` is days ago (or null = empty);
 * `time` switches it to the datetime format. `mtimeAgo` backdates the file.
 * `ref` names cards other notes link to.
 */
const CARDS = [
	// Default profile (tag card), Estufa Solar
	{
		folder: `${projectFolder('estufa')}/_Tasks`, tag: 'card', project: 'estufa',
		title: 'Medir a umidade das bancadas', status: 'todo', created: 3, completed: null,
		context: 'Caso de teste do perfil Padrão: card em todo, nunca é arquivado.',
		todo: 'Registrar a umidade de cada bancada pela manhã durante uma semana.',
	},
	{
		folder: `${projectFolder('estufa')}/_Tasks`, tag: 'card', project: 'estufa',
		title: 'Instalar sensores de temperatura', status: 'doing', created: 6, completed: null,
		context: 'Caso de teste do perfil Padrão: card em doing, nunca é arquivado.',
		todo: 'Fixar três sensores na estrutura e ligar ao painel de controle.',
	},
	{
		folder: `${projectFolder('estufa')}/_Tasks`, tag: 'card', project: 'estufa',
		title: 'Revisar o manual de montagem', status: 'review', created: 9, completed: null,
		context: 'Caso de teste do perfil Padrão: card em review, nunca é arquivado.',
		todo: 'Conferir se as fotos do manual batem com as peças entregues.',
	},
	{
		folder: `${projectFolder('estufa')}/_Tasks`, tag: 'card', project: 'estufa',
		title: 'Trocar o filtro da bomba', status: 'done', created: 15, completed: 10,
		context: 'Caso de teste do perfil Padrão: done há 10 dias, fica no lugar com 30 dias e entra na pré-visualização com 7.',
		todo: 'Substituir o filtro entupido da bomba de irrigação.',
	},
	{
		folder: `${projectFolder('estufa')}/_Tasks`, tag: 'card', project: 'estufa',
		title: 'Calibrar o timer da irrigação', status: 'done', created: 34, completed: 29,
		context: 'Caso de teste do perfil Padrão: done há 29 dias, logo abaixo do limite de 30, não é arquivado.',
		todo: 'Ajustar o timer para regar às 6h e às 18h.',
	},
	{
		ref: 'estufa31',
		folder: `${projectFolder('estufa')}/_Tasks`, tag: 'card', project: 'estufa',
		title: 'Vedar as janelas laterais', status: 'done', created: 38, completed: 31,
		context: 'Caso de teste do perfil Padrão: done há 31 dias, logo acima do limite, vai para _Tasks/Archived/ e é alvo de um link curto na retrospectiva.',
		todo: 'Aplicar silicone nas frestas das janelas laterais.',
	},
	{
		ref: 'estufa90',
		folder: `${projectFolder('estufa')}/_Tasks`, tag: 'card', project: 'estufa',
		title: 'Comprar os painéis fotovoltaicos', status: 'done', created: 98, completed: 90,
		context: 'Caso de teste do perfil Padrão: done há 90 dias, vai para _Tasks/Archived/ e é alvo de um link com caminho completo na retrospectiva.',
		todo: 'Fechar a compra dos quatro painéis com o fornecedor escolhido.',
	},
	{
		folder: `${projectFolder('estufa')}/_Tasks`, tag: 'card', project: 'estufa',
		title: 'Limpar as calhas de captação', status: 'done', created: 70, completed: null, mtimeAgo: 60,
		context: 'Caso de teste do perfil Padrão: done sem completed (e arquivo modificado há 60 dias), deve ser pulado porque o perfil usa "pular" e ignora a data de modificação.',
		todo: 'Tirar as folhas acumuladas nas calhas da água da chuva.',
	},
	{
		folder: `${projectFolder('estufa')}/_Tasks/Archived`, tag: 'card', project: 'estufa',
		title: 'Escolher o terreno da estufa', status: 'done', created: 212, completed: 200,
		context: 'Caso de teste do perfil Padrão: já arquivado há 200 dias, nunca é movido de novo e some com "Ocultar arquivados".',
		todo: 'Comparar os dois terrenos oferecidos pela associação de moradores.',
	},
	// Default profile (tag card), Viveiro Móvel
	{
		folder: `${projectFolder('viveiro')}/_Tasks`, tag: 'card', project: 'viveiro',
		title: 'Projetar o reboque das mudas', status: 'todo', created: 2, completed: null,
		context: 'Caso de teste do perfil Padrão: card em todo no segundo projeto, nunca é arquivado.',
		todo: 'Desenhar o reboque com espaço para 120 mudas.',
	},
	{
		folder: `${projectFolder('viveiro')}/_Tasks`, tag: 'card', project: 'viveiro',
		title: 'Catalogar as espécies nativas', status: 'doing', created: 7, completed: null,
		context: 'Caso de teste do perfil Padrão: card em doing no segundo projeto, nunca é arquivado.',
		todo: 'Listar as espécies nativas que cabem no reboque.',
	},
	{
		folder: `${projectFolder('viveiro')}/_Tasks`, tag: 'card', project: 'viveiro',
		title: 'Soldar as prateleiras do reboque', status: 'done', created: 40, completed: 31,
		context: 'Caso de teste do perfil Padrão: done há 31 dias no segundo projeto, vai para _Tasks/Archived/ do Viveiro Móvel.',
		todo: 'Soldar as seis prateleiras de metal no chassi do reboque.',
	},
	{
		folder: `${projectFolder('viveiro')}/_Tasks`, tag: 'card', project: 'viveiro',
		title: 'Definir a rota de visitas às escolas', status: 'done', created: 96, completed: 90,
		context: 'Caso de teste do perfil Padrão: done há 90 dias no segundo projeto, vai para _Tasks/Archived/ do Viveiro Móvel.',
		todo: 'Montar o roteiro mensal com as cinco escolas participantes.',
	},
	// Central profile (tag lab-card): datetime completed, archived by project slug
	{
		folder: 'Central', tag: 'lab-card', project: 'estufa',
		title: 'Aprovar o orçamento da cobertura', status: 'done', created: 37, completed: 31, time: '09:15',
		context: 'Caso de teste do perfil Central: done há 31 dias com data e hora, vai para Boards/Archived/estufa-solar/ com archived_from.',
		todo: 'Levar o orçamento da cobertura de policarbonato para aprovação.',
	},
	{
		folder: 'Central', tag: 'lab-card', project: 'viveiro',
		title: 'Registrar a licença de circulação', status: 'done', created: 101, completed: 90, time: '16:40',
		context: 'Caso de teste do perfil Central: done há 90 dias com data e hora, vai para Boards/Archived/viveiro-movel/ com archived_from.',
		todo: 'Registrar o reboque para circular nas ruas do bairro.',
	},
	{
		folder: 'Central', tag: 'lab-card', project: null,
		title: 'Organizar a planilha de fornecedores', status: 'done', created: 52, completed: 45, time: '11:05',
		context: 'Caso de teste do perfil Central: done há 45 dias sem projeto, deve ser pulado porque {projectSlug} não tem valor.',
		todo: 'Juntar os contatos dos fornecedores numa planilha só.',
	},
	{
		folder: 'Central', tag: 'lab-card', project: 'estufa',
		title: 'Fotografar a obra concluída', status: 'done', created: 66, completed: null, mtimeAgo: 60,
		context: 'Caso de teste do perfil Central: done sem completed e modificado há 60 dias, é arquivado pela data de modificação (não edite antes do teste).',
		todo: 'Tirar fotos da estufa pronta para o relatório da associação.',
	},
	{
		folder: 'Central', tag: 'lab-card', project: 'viveiro',
		title: 'Agendar a vistoria do reboque', status: 'todo', created: 4, completed: null,
		context: 'Caso de teste do perfil Central: card em todo, nunca é arquivado.',
		todo: 'Marcar a vistoria de segurança antes da primeira viagem.',
	},
	// Broken profile (tag broken-card): invalid archive pattern
	{
		folder: 'Broken', tag: 'broken-card', project: null,
		title: 'Encerrar o contrato de manutenção', status: 'done', created: 95, completed: 90,
		context: 'Caso de teste do perfil Quebrado: done há 90 dias, mas o padrão de arquivo do perfil é inválido, então nunca é movido.',
		todo: 'Avisar a empresa de manutenção sobre o fim do contrato.',
	},
];

// ---- settings --------------------------------------------------------------

const SETTINGS = {
	archive: {
		enabled: true,
		runOnStartup: true,
		startupDelaySeconds: 5,
		intervalHours: 0,
		maxPerRun: 50,
		confirmFirstRun: true,
		notify: true,
	},
	profiles: [
		{
			id: 'default',
			name: 'Padrão',
			cardTag: 'card',
			includeFolders: ['Archive Lab/Projects'],
			excludeFolders: ['_Templates'],
			statusProperty: 'status',
			doneValue: 'done',
			completedProperty: 'completed',
			completedFormat: 'date',
			projectProperty: 'project',
			archive: {
				enabled: true,
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
		},
		{
			id: 'central',
			name: 'Central',
			cardTag: 'lab-card',
			includeFolders: ['Archive Lab/Central'],
			excludeFolders: ['_Templates'],
			statusProperty: 'status',
			doneValue: 'done',
			completedProperty: 'completed',
			completedFormat: 'datetime',
			projectProperty: 'project',
			archive: {
				enabled: true,
				afterDays: 30,
				folderPattern: 'Archive Lab/Boards/Archived/{projectSlug}',
				missingCompleted: 'useModified',
				recordOriginProperty: 'archived_from',
			},
			newCard: {
				folderPattern: 'Archive Lab/Central/{projectSlug}',
				fallbackFolder: 'Archive Lab/Central',
				fileNamePattern: '{slug}',
				templatePath: '',
				defaultType: 'task',
			},
		},
		{
			id: 'broken',
			name: 'Quebrado',
			cardTag: 'broken-card',
			includeFolders: ['Archive Lab/Broken'],
			excludeFolders: [],
			statusProperty: 'status',
			doneValue: 'done',
			completedProperty: 'completed',
			completedFormat: 'date',
			projectProperty: 'project',
			archive: {
				enabled: true,
				afterDays: 30,
				folderPattern: '{cardFolder}/{nope}',
				missingCompleted: 'skip',
				recordOriginProperty: '',
			},
			newCard: {
				folderPattern: '{projectFolder}/_Tasks',
				fallbackFolder: '',
				fileNamePattern: '{date:YYYY-MM-DD}-{slug}',
				templatePath: '',
				defaultType: 'task',
			},
		},
	],
	confirmedProfiles: [],
};

// ---- writers ---------------------------------------------------------------

/** Write a note under LAB (UTF-8, LF). Returns the absolute path. */
function writeNote(relPath, content) {
	const path = join(LAB, relPath);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, content.replace(/\r\n/g, '\n'), 'utf8');
	return path;
}

const quote = (text) => JSON.stringify(text);

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
		'Os cards ficam em `_Tasks/`; os arquivados pelo perfil Padrão, em `_Tasks/Archived/`.',
		'',
	].join('\n');
}

function cardNote(card) {
	const completed =
		card.completed === null ? '' : card.time ? daysAgoAt(card.completed, card.time) : daysAgo(card.completed);
	return [
		'---',
		`title: ${quote(card.title)}`,
		'type: task',
		`status: ${card.status}`,
		`project: ${quote(card.project ? projectLink(card.project) : '')}`,
		'executor: me',
		`created: ${daysAgo(card.created)}`,
		'due:',
		completed ? `completed: ${completed}` : 'completed:',
		`tags: [${card.tag}]`,
		'---',
		'## Contexto',
		'',
		card.context,
		'',
		'## O que fazer',
		'',
		card.todo,
		'',
		'## Notas de execução',
		'',
		'',
	].join('\n');
}

function retrospectiveNote(fullPathCard, shortCard) {
	return [
		'---',
		'title: "Retrospectiva da Estufa Solar"',
		'---',
		'# Retrospectiva da Estufa Solar',
		'',
		'Nota de teste da reescrita de links: não é card (não tem a tag `card`) e aponta para dois cards que serão arquivados.',
		'',
		`- Os painéis chegaram antes do previsto: [[${LAB_VAULT}/${fullPathCard.folder}/${fullPathCard.basename}|compra dos painéis]] (link com caminho completo).`,
		`- As janelas deixaram de pingar depois da vedação: [[${shortCard.basename}]] (link curto).`,
		'',
		'Depois de arquivar, os dois links devem continuar resolvendo e apontar para `_Tasks/Archived/`.',
		'',
	].join('\n');
}

// ---- run -------------------------------------------------------------------

mkdirSync(LAB, { recursive: true });
for (const name of GENERATED) {
	const target = join(LAB, name);
	assertInsideLab(target);
	rmSync(target, { recursive: true, force: true });
}

for (const project of Object.values(PROJECTS)) {
	writeNote(`Projects/${project.name}/index.md`, projectNote(project));
}

const refs = {};
for (const card of CARDS) {
	card.basename = `${daysAgo(card.created)}-${slugify(card.title)}`;
	const path = writeNote(`${card.folder}/${card.basename}.md`, cardNote(card));
	if (card.mtimeAgo !== undefined) {
		const when = dateAgo(card.mtimeAgo, 10, 0);
		utimesSync(path, when, when);
	}
	if (card.ref) refs[card.ref] = card;
}

writeNote(`${projectFolder('estufa')}/retrospectiva.md`, retrospectiveNote(refs.estufa90, refs.estufa31));

mkdirSync(dirname(DATA_JSON), { recursive: true });
writeFileSync(DATA_JSON, JSON.stringify(SETTINGS, null, '\t') + '\n', 'utf8');

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

console.log(`✔ Archive Lab fixtures generated (today: ${daysAgo(0)}), ${total} notes:`);
for (const [folder, n] of [...counts].sort(([a], [b]) => a.localeCompare(b))) {
	console.log(`    ${folder}: ${n}`);
}
console.log(`✔ Settings written: ${relative(ROOT, DATA_JSON)} (${SETTINGS.profiles.length} profiles, none confirmed)`);
for (const file of ['index.md', 'lab.base']) {
	if (!existsSync(join(LAB, file))) console.log(`• Missing committed file: ${LAB_VAULT}/${file}`);
}
console.log('• If Obsidian is open on dev-vault, the plugin reloads its settings automatically; otherwise reopen the vault.');
