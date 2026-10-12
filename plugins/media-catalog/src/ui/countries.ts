import { ALIAS_COUNTRY_CODES } from '../constants';
import type { AliasCountry } from '../constants';
import { locale } from '../i18n';

/**
 * Country names in the language of the UI, from Intl: no country needs a
 * message of its own. Without Intl.DisplayNames the code stands alone.
 */

let names: Intl.DisplayNames | null | undefined;

function displayNames(): Intl.DisplayNames | null {
	if (names !== undefined) return names;
	try {
		names = new Intl.DisplayNames([locale(), 'en'], { type: 'region' });
	} catch {
		names = null;
	}
	return names;
}

/** "Brasil (BR)", or "BR" when the name is unknown. */
export function countryLabel(code: AliasCountry): string {
	const name = displayNames()?.of(code);
	return name && name !== code ? `${name} (${code})` : code;
}

/** Every alias country with its label, sorted by label. */
export function countriesByName(): [AliasCountry, string][] {
	return ALIAS_COUNTRY_CODES.map((code): [AliasCountry, string] => [code, countryLabel(code)]).sort((a, b) =>
		a[1].localeCompare(b[1], locale()),
	);
}
