import type { Translation } from '@obsidian-plugins/i18n';
import type { en } from './en';

export const ptBR: Translation<typeof en> = {
	'command.collect': 'Recolher anexos soltos',
	'command.orphans': 'Listar anexos órfãos',

	'size.kb': '{value} KB',
	'size.mb': '{value} MB',

	'notice.moved.one': 'Attachments Guard: movido para {path}.',
	'notice.moved.other': 'Attachments Guard: {count} anexos novos movidos para {folder}.',
	'notice.cover': 'Attachments Guard: capa renomeada para {name}.',
	'notice.size': 'Attachments Guard: {name} tem {size} (limite: {limit}).',
	'notice.failed': '{count} não puderam ser movidos (detalhes no console do desenvolvedor).',
	'notice.collect.none': 'Nenhum anexo solto: está tudo em {folder}.',
	'notice.collect.running': 'O recolhimento de anexos já está em andamento.',
	'notice.collect.progress': 'Movendo anexos… {done}/{total}',
	'notice.collect.done.one': '1 anexo movido.',
	'notice.collect.done.other': '{count} anexos movidos.',
	'notice.orphans.running': 'A busca por anexos órfãos já está em andamento.',
	'notice.orphans.scanning': 'Procurando anexos órfãos…',
	'notice.orphans.none': 'Nenhum anexo órfão.',
	'notice.orphans.done.one': '1 anexo movido para .trash.',
	'notice.orphans.done.other': '{count} anexos movidos para .trash.',

	'modal.cancel': 'Cancelar',
	'modal.more': '…e mais {count}.',
	'modal.collect.title': 'Recolher anexos soltos',
	'modal.collect.message.one': '1 anexo fora de {folder} vai ser movido para lá. Os links nas notas são atualizados.',
	'modal.collect.message.other': '{count} anexos fora de {folder} vão ser movidos para lá. Os links nas notas são atualizados.',
	'modal.collect.confirm': 'Mover',
	'modal.orphans.title': 'Anexos órfãos',
	'modal.orphans.message.one':
		'1 anexo ({size}) para o qual nenhuma nota, canvas ou base aponta. Se marcado, vai para .trash, dentro da pasta de origem; nada é apagado.',
	'modal.orphans.message.other':
		'{count} anexos ({size}) para os quais nenhuma nota, canvas ou base aponta. Os marcados vão para .trash, dentro das pastas de origem; nada é apagado.',
	'modal.orphans.all': 'Marcar todos',
	'modal.orphans.none': 'Desmarcar todos',
	'modal.orphans.select': 'Marcar {name}',
	'modal.orphans.confirm': 'Mover {count} para .trash',

	'settings.new.heading': 'Anexos novos',
	'settings.organize.name': 'Organizar automaticamente',
	'settings.organize.desc':
		'Arquivos colados, arrastados e gravados, e os que aparecem fora da pasta de anexos, vão para ela com a regra de nome; capas ganham o nome de capa. Desligado, vale o "Local padrão para novos anexos" do Obsidian.',
	'settings.folder.name': 'Pasta de anexos',
	'settings.folder.desc': 'Todo anexo vai para cá. As subpastas contam como dentro.',
	'settings.pattern.name': 'Nome para arquivos genéricos',
	'settings.pattern.desc':
		'Usado quando o nome original não diz nada (Pasted image, IMG_1234, logo). Nomes descritivos ficam como estão. Variáveis: {list}. {note} é a nota onde o arquivo entrou (a pasta, para notas index; a data, quando não há nota); {n} conta a partir de 1.',
	'settings.example.name': 'Exemplo',
	'settings.example.note': 'Relatório trimestral',
	'settings.example.desc': 'Uma imagem colada na nota "{note}" vira {name}.',
	'settings.generic.name': 'Nomes genéricos',
	'settings.generic.desc':
		'Um por linha. Comparados sem acentos, maiúsculas, números e separadores: "image" também pega "Image (2)" e "image_20260930", e nomes só com números são sempre genéricos.',
	'settings.maxSize.name': 'Aviso de tamanho',
	'settings.maxSize.desc': 'Avisa quando um anexo novo passa deste tamanho, em MB. 0 desliga o aviso.',
	'settings.cover.heading': 'Capas',
	'settings.coverProperty.name': 'Propriedade da capa',
	'settings.coverProperty.desc':
		'Quando essa propriedade aponta para um anexo ("[[imagem.png]]") que nenhuma outra nota usa, o anexo é renomeado para <nota>-cover. Vazio desliga.',
	'settings.ai.heading': 'Notas geradas por IA',
	'settings.aiTag.name': 'Tag',
	'settings.aiTag.desc': 'Notas com essa tag, nas propriedades ou no texto, guardam os anexos numa pasta separada.',
	'settings.aiFolder.name': 'Pasta',
	'settings.aiFolder.desc': 'Vazio mantém na pasta de anexos.',
	'settings.exceptions.heading': 'Exceções',
	'settings.ignored.name': 'Pastas ignoradas',
	'settings.ignored.desc':
		'Uma por linha. Anexos nelas nunca são movidos nem listados, e notas nelas seguem o local de anexos do Obsidian.',
	'settings.tools.heading': 'Ferramentas',
	'settings.collect.name': 'Recolher anexos soltos',
	'settings.collect.desc': 'Move para a pasta de anexos todo anexo que está fora dela, depois de mostrar a lista.',
	'settings.orphans.name': 'Listar anexos órfãos',
	'settings.orphans.desc': 'Anexos para os quais nenhuma nota, canvas ou base aponta. Os que você marcar vão para .trash.',

	'validation.folder.empty': 'Informe uma pasta.',
	'validation.folder.hidden': 'Pastas ocultas (começando com ".") não fazem parte do vault.',
	'validation.pattern.empty': 'O nome não pode ficar vazio.',
	'validation.pattern.slash': 'Informe só o nome, sem "/".',
	'validation.pattern.unknown': 'Variável desconhecida: {names}.',
	'validation.size': 'Informe um número de 0 a {max}.',
};
