import type { Translation } from '@obsidian-plugins/i18n';
import type { en } from './en';

export const ptBR: Translation<typeof en> = {
	'command.insert': 'Inserir bloco de pseudocódigo',
	'command.insertAlgorithm2e': 'Inserir bloco de pseudocódigo (algorithm2e)',
	'command.copyLatex': 'Copiar o bloco de pseudocódigo como LaTeX',

	'block.copy': 'Copiar como LaTeX',
	'block.empty': 'Bloco de pseudocódigo vazio.',

	'notice.copied': 'LaTeX copiado para a área de transferência.',
	'notice.copyFailed': 'Não foi possível copiar para a área de transferência.',
	'notice.noBlock': 'Coloque o cursor dentro de um bloco pseudo.',
	'notice.invalid': 'Este bloco tem um erro. Corrija antes de exportar.',

	'error.title': 'Erro no pseudocódigo',
	'error.line': 'Linha {line}: {message}',
	'error.expected': 'esperava {expected}, encontrou {found}.',
	'error.unexpected': '{found} está fora do lugar aqui.',
	'error.endOfBlock': 'o bloco termina antes de {expected}.',
	'error.endOfBlockEmpty': 'o bloco termina antes da hora.',
	'error.unknownCommand': 'comando desconhecido {name}.',
	'error.unknownEnvironment': 'ambiente desconhecido {name}.',
	'error.unclosedMath': 'fórmula sem o {delimiter} de fechamento.',
	'error.unsupported': '{name} ainda não é suportado.',

	'ref.missing': 'Nenhum algoritmo com o rótulo {label} nesta nota.',
	'ref.goTo': 'Ir para {title}',

	'settings.appearance.heading': 'Aparência',
	'settings.numberAlgorithms.name': 'Numerar algoritmos',
	'settings.numberAlgorithms.desc':
		'As legendas ficam "Algorithm 1", "Algorithm 2"... na ordem da nota. Desligado, mostram "Algorithm" e o título, como no plugin da comunidade. As referências (\\ref) sempre usam os números.',
	'settings.lineNumbers.name': 'Numerar linhas',
	'settings.lineNumbers.desc':
		'Numera as linhas de todos os algoritmos. Um bloco pode mudar isso com \\begin{algorithmic}[0] ou [1], ou com \\LinesNumbered no algorithm2e.',
	'settings.punctuation.name': 'Depois do número da linha',
	'settings.punctuation.desc': 'Texto mostrado depois de cada número de linha, como em "1:".',
	'settings.indent.name': 'Recuo',
	'settings.indent.desc': 'Largura de cada nível de recuo, em em.',
	'settings.scopeLines.name': 'Linhas de escopo',
	'settings.scopeLines.desc':
		'Linhas verticais ao longo do corpo de cada bloco. No algorithm2e, \\SetAlgoLined e \\SetAlgoVlined ligam as linhas para o bloco.',
	'settings.showEnd.name': 'Fim de bloco',
	'settings.showEnd.desc':
		'Mostra linhas como "end if" e "end for". No algorithm2e, \\SetAlgoNoEnd e \\SetAlgoVlined escondem essas linhas no bloco.',
	'settings.comment.name': 'Delimitador de comentário',
	'settings.comment.desc': 'Mostrado antes dos comentários (\\Comment, \\tcp).',
	'settings.language.heading': 'Idioma',
	'settings.keywords.name': 'Idioma do pseudocódigo',
	'settings.keywords.desc':
		'Idioma das palavras-chave, como "if", "for" e "return", e da legenda ("Algorithm 1"). O que você escreve no bloco nunca muda.',
	'settings.keywords.en': 'English',
	'settings.keywords.ptBR': 'Português',
	'settings.export.heading': 'Exportação para LaTeX',
	'settings.exportDocument.name': 'Documento completo',
	'settings.exportDocument.desc':
		'Copia um documento compilável, com o preâmbulo do algorithm2e, em vez de só o ambiente algorithm.',

	'validation.indent': 'Digite um número entre {min} e {max}.',
};
