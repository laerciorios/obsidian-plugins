import type { App, SettingDefinitionItem, SettingDefinitionRender, SettingGroupItem } from 'obsidian';
import { newRuleId } from '../config/reader';
import type { FeatureId, GraphKitConfig } from '../config/types';
import { defaultFeatureConfig } from '../features/registry';
import type { FeatureStatus } from '../graph-host';
import { t } from '../i18n';
import { ruleSummary } from '../rules/summary';
import type { Rule } from '../rules/types';
import { RuleModal } from '../ui/rule-modal';
import type { EffectEditor } from '../ui/rule-modal';
import { toggleOption } from './options';
import type { OptionHost } from './options';

/** What a feature section needs from the settings tab. */
export interface SectionHost extends OptionHost {
	app: App;
	config: GraphKitConfig;
	featureStatus(id: FeatureId): FeatureStatus;
}

export interface RulesSpec<E> {
	heading: string;
	get: () => Rule<E>[];
	newEffect: () => E;
	summary: (effect: E) => string;
	editor: EffectEditor<E>;
}

export interface SectionSpec<E> {
	id: FeatureId;
	/** The feature's own options, shown only while it is on. */
	options: SettingGroupItem[];
	rules?: RulesSpec<E>;
}

/**
 * One feature: its switch on top, a note when the internals it needs are missing, the switches
 * per graph and its options (hidden while it is off), then its rules.
 */
export function featureSection<E>(host: SectionHost, spec: SectionSpec<E>): SettingDefinitionItem[] {
	const { id } = spec;
	const feature = () => host.config.features[id];
	const name = t(`feature.${id}.name`);
	const on = () => feature().enabled;
	const status = host.featureStatus(id);
	const defaults = defaultFeatureConfig(id);
	const showOptions = (item: SettingGroupItem): SettingGroupItem => ('type' in item ? item : { ...item, visible: on });

	const items: SettingGroupItem[] = [
		toggleOption(host, {
			name: t('settings.feature.enable', { feature: name.toLowerCase() }),
			desc: t(`feature.${id}.desc`),
			get: () => feature().enabled,
			set: (value) => (feature().enabled = value),
			defaultValue: defaults.enabled,
		}),
	];
	if (status.state === 'unavailable') {
		items.push({ name: t('settings.feature.unavailable.name'), desc: t('settings.feature.unavailable.desc', { reason: status.reason }) });
	}
	items.push(
		toggleOption(host, {
			name: t('settings.feature.global'),
			get: () => feature().graphs.global,
			set: (value) => (feature().graphs.global = value),
			defaultValue: defaults.graphs.global,
			visible: on,
		}),
		toggleOption(host, {
			name: t('settings.feature.local'),
			get: () => feature().graphs.local,
			set: (value) => (feature().graphs.local = value),
			defaultValue: defaults.graphs.local,
			visible: on,
		}),
		...spec.options.map(showOptions),
	);

	const section: SettingDefinitionItem[] = [
		{
			type: 'group',
			heading: name,
			extraButtons: [
				(button) =>
					button
						.setIcon('rotate-ccw')
						.setTooltip(t('settings.resetSection'))
						.onClick(() => {
							// Rules are the user's data, not options: they stay.
							host.config.features[id] = { ...defaultFeatureConfig(id), rules: feature().rules };
							host.changed(true);
						}),
			],
			items,
		},
	];
	if (spec.rules) section.push(rulesList(host, spec.rules, on));
	return section;
}

function rulesList<E>(host: SectionHost, spec: RulesSpec<E>, visible: () => boolean): SettingDefinitionItem {
	const open = (rule: Rule<E>, isNew: boolean, save: (rule: Rule<E>) => void) => new RuleModal(host.app, rule, isNew, spec.editor, save).open();
	return {
		type: 'list',
		heading: spec.heading,
		visible,
		emptyState: t('rules.empty'),
		onReorder: (from, to) => {
			const rules = spec.get();
			const [moved] = rules.splice(from, 1);
			if (moved) rules.splice(to, 0, moved);
			host.changed(true);
		},
		onDelete: (index) => {
			spec.get().splice(index, 1);
			host.changed(true);
		},
		addItem: {
			name: t('rules.add'),
			action: () =>
				open({ id: newRuleId(), name: '', enabled: true, match: 'all', conditions: [], effect: spec.newEffect() }, true, (rule) => {
					spec.get().push(rule);
					host.changed(true);
				}),
		},
		items: spec.get().map((rule, index) => ruleRow(host, spec, rule, index, open)),
	};
}

function ruleRow<E>(
	host: SectionHost,
	spec: RulesSpec<E>,
	rule: Rule<E>,
	index: number,
	open: (rule: Rule<E>, isNew: boolean, save: (rule: Rule<E>) => void) => void,
): SettingDefinitionRender {
	const replace = (next: Rule<E>) => {
		const rules = spec.get();
		const at = rules.findIndex((own) => own.id === rule.id);
		if (at >= 0) rules[at] = next;
		host.changed(true);
	};
	return {
		name: rule.name || t('rules.unnamed', { number: index + 1 }),
		desc: ruleSummary(rule, spec.summary),
		render: (setting) => {
			setting.settingEl.toggleClass('gk-rule-off', !rule.enabled);
			setting
				.addToggle((toggle) =>
					toggle
						.setTooltip(t('rules.enabled'))
						.setValue(rule.enabled)
						.onChange((value) => replace({ ...rule, enabled: value })),
				)
				.addExtraButton((button) => button.setIcon('pencil').setTooltip(t('rules.edit')).onClick(() => open(rule, false, replace)));
		},
	};
}
