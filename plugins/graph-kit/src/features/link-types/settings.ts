import { Notice } from 'obsidian';
import type { App, SettingDefinitionItem, SettingDefinitionRender } from 'obsidian';
import { PRESET_COLORS, colorCss } from '../../colors';
import { t } from '../../i18n';
import { featureSection } from '../../settings/feature-section';
import type { SectionHost } from '../../settings/feature-section';
import { dropdownOption, toggleOption } from '../../settings/options';
import { LEGEND_POSITIONS, defaultLinkTypes, propertyType } from './config';
import type { LegendPosition, LinkType, LinkTypesConfig } from './config';
import { linkTypeName } from './legend';
import { LinkTypeModal } from './type-modal';

function sameSource(a: LinkType, b: LinkType): boolean {
	if (a.source.kind === 'body' || b.source.kind === 'body') return a.source.kind === b.source.kind;
	return a.source.key.toLowerCase() === b.source.key.toLowerCase();
}

function summary(type: LinkType): string {
	const color = type.color ? (type.color.kind === 'hex' ? type.color.value : t(`color.${type.color.value}`)) : t('color.none');
	const parts = [color, t(`linkTypes.style.${type.style}`)];
	if (!type.visible) parts.push(t('linkTypes.hiddenEverywhere'));
	return parts.join(' · ');
}

/** Frontmatter keys that hold links somewhere in the vault, from the metadata cache. */
export function propertiesWithLinks(app: App): string[] {
	const keys = new Map<string, string>();
	for (const file of app.vault.getMarkdownFiles()) {
		for (const link of app.metadataCache.getFileCache(file)?.frontmatterLinks ?? []) {
			const key = link.key.split('.')[0] ?? link.key;
			if (key !== '' && !keys.has(key.toLowerCase())) keys.set(key.toLowerCase(), key);
		}
	}
	return [...keys.values()].sort((a, b) => a.localeCompare(b));
}

export function linkTypesSettings(host: SectionHost): SettingDefinitionItem[] {
	const config = (): LinkTypesConfig => host.config.features['link-types'];
	const defaults = defaultLinkTypes();
	const positions = Object.fromEntries(LEGEND_POSITIONS.map((position) => [position, t(`linkTypes.position.${position}`)])) as Record<LegendPosition, string>;

	const open = (type: LinkType, isNew: boolean, save: (type: LinkType) => void) =>
		new LinkTypeModal(host.app, type, isNew, (draft) => config().types.some((other) => other.id !== draft.id && sameSource(other, draft)), save).open();

	const row = (type: LinkType): SettingDefinitionRender => ({
		name: linkTypeName(type),
		desc: summary(type),
		render: (setting) => {
			const swatch = setting.nameEl.createSpan({ cls: ['gk-legend-swatch', 'gk-name-swatch', `gk-line-${type.style}`] });
			if (type.color) swatch.setCssProps({ '--gk-line-color': colorCss(type.color) });
			setting.nameEl.prepend(swatch);
			setting.settingEl.toggleClass('gk-rule-off', !type.visible);
			setting
				.addToggle((toggle) =>
					toggle
						.setTooltip(t('linkTypes.modal.visible.name'))
						.setValue(type.visible)
						.onChange((value) => {
							type.visible = value;
							host.changed(true);
						}),
				)
				.addExtraButton((button) =>
					button
						.setIcon('pencil')
						.setTooltip(t('linkTypes.edit'))
						.onClick(() =>
							open(type, false, (next) => {
								const at = config().types.findIndex((own) => own.id === type.id);
								if (at >= 0) config().types[at] = next;
								host.changed(true);
							}),
						),
				);
		},
	});

	const detect = () => {
		const types = config().types;
		const fresh = propertiesWithLinks(host.app).filter((key) => !types.some((type) => type.source.kind === 'property' && type.source.key.toLowerCase() === key.toLowerCase()));
		fresh.forEach((key, index) => types.push(propertyType(key, { kind: 'preset', value: PRESET_COLORS[(types.length + index) % PRESET_COLORS.length] ?? 'blue' })));
		new Notice(fresh.length > 0 ? t('linkTypes.detected', { keys: fresh.join(', ') }) : t('linkTypes.detectedNone'));
		host.changed(true);
	};

	return featureSection(host, {
		id: 'link-types',
		options: [
			toggleOption(host, {
				name: t('settings.linkTypes.legend.name'),
				desc: t('settings.linkTypes.legend.desc'),
				get: () => config().legend.show,
				set: (value) => (config().legend.show = value),
				defaultValue: defaults.legend.show,
			}),
			dropdownOption<LegendPosition>(host, {
				name: t('settings.linkTypes.position.name'),
				options: positions,
				get: () => config().legend.position,
				set: (value) => (config().legend.position = value),
				defaultValue: defaults.legend.position,
			}),
			{ name: t('settings.linkTypes.detect.name'), desc: t('settings.linkTypes.detect.desc'), action: detect },
		],
		after: (on) => [
			{
				type: 'list',
				heading: t('settings.linkTypes.types'),
				visible: on,
				emptyState: t('settings.linkTypes.empty'),
				onReorder: (from, to) => {
					const types = config().types;
					const [moved] = types.splice(from, 1);
					if (moved) types.splice(to, 0, moved);
					host.changed(true);
				},
				onDelete: (index) => {
					config().types.splice(index, 1);
					host.changed(true);
				},
				addItem: {
					name: t('linkTypes.add'),
					action: () =>
						open(propertyType(''), true, (type) => {
							config().types.push(type);
							host.changed(true);
						}),
				},
				items: config().types.map(row),
			},
		],
	});
}
