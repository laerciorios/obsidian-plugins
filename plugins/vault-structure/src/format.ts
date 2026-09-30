/**
 * Folders for a sentence, sharing parents: `_Discovery/AI Generated/,
 * _References/{Books, Links, Videos, Repos}/`. Order is kept.
 */
export function describeFolders(folders: readonly string[]): string {
	const groups = new Map<string, string[]>();
	for (const folder of folders) {
		const slash = folder.indexOf('/');
		const [parent, rest] = slash > 0 ? [folder.slice(0, slash), folder.slice(slash + 1)] : [folder, ''];
		const group = groups.get(parent) ?? [];
		group.push(rest);
		groups.set(parent, group);
	}
	return [...groups.entries()]
		.map(([parent, rests]) => {
			const children = rests.filter(Boolean);
			if (children.length === 0) return `${parent}/`;
			if (children.length === 1) return `${parent}/${children[0]}/`;
			return `${parent}/{${children.join(', ')}}/`;
		})
		.join(', ');
}
