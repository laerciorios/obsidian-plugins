import { setIcon } from 'obsidian';
import { CLS } from '../constants';
import { t } from '../i18n';
import { isImageUrl } from '../providers/http';

/**
 * Cover image, or a placeholder when there is no usable URL or the image fails
 * to load. Only https URLs on IMAGE_HOSTS reach an <img>, and no referrer is
 * sent (IMDb and Google refuse hotlinks that carry a foreign referrer).
 */
export function createCoverImg(parent: HTMLElement, src: string | undefined, alt: string, cls?: string): HTMLElement {
	return createImgOrPlaceholder(parent, src && isImageUrl(src) ? src : null, alt, cls);
}

/**
 * <img> for a source the caller has vetted (a search cover checked by
 * createCoverImg, or the note's current cover), with the same placeholder.
 */
export function createImgOrPlaceholder(parent: HTMLElement, src: string | null, alt: string, cls?: string): HTMLElement {
	if (!src) return parent.appendChild(coverPlaceholder(cls));

	const img = parent.createEl('img', {
		cls: cls ? [CLS.coverImg, cls] : CLS.coverImg,
		attr: { src, alt, loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' },
	});
	img.addEventListener('error', () => img.replaceWith(coverPlaceholder(cls)), { once: true });
	return img;
}

function coverPlaceholder(cls?: string): HTMLElement {
	const el = createDiv({
		cls: cls ? [CLS.coverEmpty, cls] : CLS.coverEmpty,
		attr: { role: 'img', 'aria-label': t('search.noCover') },
	});
	setIcon(el, 'image-off');
	return el;
}
