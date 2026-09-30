import type { Messages } from '@obsidian-plugins/i18n';

/**
 * Source catalog (English). Every user-facing string of the plugin lives here.
 * Brand names (IMDb, TVmaze…) come from the providers and are not keys.
 * Values written to notes (kind, status, "Leitura"…) are data, not keys.
 */
export const en = {
	// ---- commands ----------------------------------------------------------
	'command.add': 'Add to catalog',
	'command.changeCover': 'Change cover',
	'command.markFinished': 'Mark as finished',
	'command.updateTracks': 'Update album tracks',

	// ---- kinds and statuses (labels only; notes store the English values) --
	'kind.movie': 'Movie',
	'kind.series': 'Series',
	'kind.game': 'Game',
	'kind.book': 'Book',
	'kind.album': 'Album',
	'status.backlog': 'Backlog',
	'status.in-progress': 'In progress',
	'status.done': 'Done',
	'status.dropped': 'Dropped',

	// ---- modal: shared ------------------------------------------------------
	'modal.add.title': 'Add to catalog',
	'modal.cover.title': 'Change cover',
	'modal.tracks.title': 'Update album tracks',
	'modal.season.title': 'Choose the season',
	'modal.confirm.title': 'Check the details',
	'modal.back': 'Back',
	'modal.instructions.navigate': 'to navigate',
	'modal.instructions.choose': 'to choose',
	'modal.instructions.close': 'to close',
	'modal.instructions.submit': 'to save',

	// ---- search step --------------------------------------------------------
	'search.kind': 'Type',
	'search.source': 'Source',
	'search.placeholder': 'Search by title…',
	'search.placeholderAlbum': 'Search by title or artist…',
	'search.hint': 'Type at least {min} characters and pick a result. Nothing is saved before you confirm.',
	'search.loading': 'Searching {source}…',
	'search.empty': 'Nothing found for "{query}" in {source}.',
	'search.retry': 'Try again',
	'search.noCover': 'No cover',
	'search.results': 'Results',

	// ---- after the pick (albums: the cover is checked before the form) ------
	'resolve.loading': 'Looking for the cover…',
	'resolve.loadingBoth': 'Looking for the cover and tracks…',
	'resolve.loadingTracks': 'Looking for the tracks…',
	'album.type.album': 'Album',
	'album.type.ep': 'EP',
	'album.tracks': '{count} tracks',
	'album.tracksOne': '1 track',
	'album.discs': '{count} discs',

	// ---- tracklist (confirm preview and "Update album tracks") -------------
	'tracks.unavailable': 'Tracklist unavailable: the note will be created without it.',
	'tracks.edition': 'Edition',
	'tracks.editionDesc': 'Editions can have other tracks: bonus tracks, an extra disc. The first one is the original release.',
	'tracks.loadingEditions': 'Loading editions…',
	'tracks.loading': 'Loading tracks…',
	'tracks.empty': 'No tracks listed for this edition.',
	'tracks.list': 'Tracks',
	'tracks.hint': 'Only the "{heading}" section of the note changes. When the note has none, it is created before "{impressions}", or at the end.',
	'tracks.update': 'Update tracks',

	// ---- season step --------------------------------------------------------
	'season.loading': 'Loading seasons…',
	'season.empty': 'This series has no seasons listed.',
	'season.label': 'Season {number}',
	'season.episodes': '{count} episodes',
	'season.episodesOne': '1 episode',
	'season.episodesUnknown': 'Episode count unknown',

	// ---- confirm step -------------------------------------------------------
	'field.title.name': 'Title',
	'field.title.desc': 'Original or English title, as in the rest of the catalog.',
	'field.title.descBook': 'Title of the edition you read.',
	'field.title.descAlbum': 'Title as released.',
	'field.year.name': 'Year',
	'field.year.desc': 'Release year.',
	'field.year.descSeries': 'Year the season premiered.',
	'field.year.descBook': 'Year of first publication.',
	'field.year.descBookEdition': 'Year of this edition. The catalog uses the year of first publication: adjust if you know it.',
	'field.year.descAlbum': 'Year of the original release, not of a reissue or remaster.',
	'field.status.name': 'Status',
	'field.started.name': 'Started',
	'field.finished.name': 'Finished',
	'field.date.desc': 'YYYY-MM-DD. Empty: no date.',
	'field.started.descAlbum': 'First listen (YYYY-MM-DD). Empty: no date.',
	'field.finished.descAlbum': 'First full listen (YYYY-MM-DD). Empty: no date.',
	'field.rating.name': 'Rating',
	'field.rating.desc': 'From 1 to 10. Empty: no rating.',
	'field.platform.name': 'Platform',
	'field.platform.desc': 'Where you watched it: cinema, a streaming service… Empty is fine.',
	'field.platform.descGame': 'Console, PC or mobile.',
	'field.platform.descBook': 'Format: print, eBook, audiobook…',
	'field.platform.descAlbum': 'Where you listened: Spotify, YouTube Music, vinyl…',
	'field.season.name': 'Season',
	'field.episodes.name': 'Episodes',
	'field.episodes.desc': 'Episodes in the season.',
	'field.hours.name': 'Hours',
	'field.hours.desc': 'Total play time. Empty: not tracked.',
	'field.author.name': 'Author',
	'field.artist.name': 'Artist',
	'field.artist.desc': 'Artist or band.',
	'field.pages.name': 'Pages',
	'field.technical.name': 'Technical book',
	'field.technical.desc': 'Also creates a reference note in the chosen area and links both notes.',
	'field.technical.none': 'No folder with _References/Books in the vault.',
	'field.area.name': 'Area',
	'field.cover.name': 'Cover',
	'field.cover.desc': 'Keep the link to the image or save a copy in the attachments folder.',
	'field.cover.url': 'Keep the link',
	'field.cover.download': 'Download to attachments',
	'field.cover.none': 'No cover found. The note is created without one.',
	'confirm.duplicate': 'Already in the catalog: {name}.',
	'confirm.open': 'Open note',
	'confirm.create': 'Create note',
	'confirm.updateCover': 'Update cover',
	'confirm.saving': 'Saving…',
	'cover.current': 'Current',
	'cover.new': 'New',
	'cover.same': 'The note already uses this cover.',
	'cover.season': 'Season poster',
	'cover.series': 'Series poster',

	// ---- rating modal -------------------------------------------------------
	'rating.title': 'Rating',
	'rating.desc': 'How would you rate "{title}"? Status becomes done and today is the finish date.',
	'rating.skip': 'Finish without rating',
	'rating.cancel': 'Cancel',

	// ---- validation ---------------------------------------------------------
	'validation.title': 'The title cannot be empty.',
	'validation.year': 'Use a four-digit year.',
	'validation.rating': 'Use a whole number from 1 to 10.',
	'validation.date': 'Use the YYYY-MM-DD format.',
	'validation.number': 'Use a number, zero or more.',

	// ---- errors (search, download) -----------------------------------------
	'error.http': '{host} answered with error {status}.',
	'error.network': 'No answer from {host}. Check your connection.',
	'error.denied': '{source} refused the request. Check the API key in the plugin settings.',
	'error.rateLimit': '{source} is limiting requests. Wait a moment and try again, or check the API key.',
	'error.rateLimitNoKey': '{source} is limiting requests. Wait a moment and try again.',
	'error.credentials': '{source} needs an API key. Add it in the plugin settings.',
	'error.blocked': 'Request to {host} blocked: the host is not on the allowed list.',
	'error.unexpected': 'Unexpected answer from {source}.',
	'error.unknown': 'Something went wrong with {source}.',

	// ---- notices ------------------------------------------------------------
	'notice.created': 'Media Catalog: created "{name}".',
	'notice.createFailed': 'Media Catalog: could not create the note.',
	'notice.duplicate': 'Media Catalog: "{name}" is already in the catalog.',
	'notice.coverUpdated': 'Media Catalog: cover of "{name}" updated.',
	'notice.coverFailed': 'Media Catalog: could not update the cover of "{name}".',
	'notice.downloadFailed': 'Media Catalog: could not download the cover, the note keeps the link.',
	'notice.finished': 'Media Catalog: "{name}" marked as done.',
	'notice.finishFailed': 'Media Catalog: could not update "{name}".',
	'notice.referenceCreated': 'Media Catalog: reference note "{name}" created.',
	'notice.referenceExists': 'Media Catalog: reference note "{name}" already existed and was linked.',
	'notice.referenceFailed': 'Media Catalog: the note was created, but not the reference note.',
	'notice.tracksMissing': 'Media Catalog: tracklist unavailable, the note was created without it.',
	'notice.tracksUpdated': 'Media Catalog: tracks of "{name}" updated.',
	'notice.tracksFailed': 'Media Catalog: could not update the tracks of "{name}".',
	'notice.folderIsFile': 'Media Catalog: "{path}" is a file, not a folder. Check the catalog folder setting.',

	// ---- settings -----------------------------------------------------------
	'settings.notes.heading': 'Notes',
	'settings.folder.name': 'Catalog folder',
	'settings.folder.desc': 'New notes are created here, and duplicates are looked for here.',
	'settings.templateFile.name': 'Template',
	'settings.templateFile.desc':
		'Its body (everything after the properties) goes into each new note. Empty: media.md in the core templates folder.',
	'settings.addSourceLink.name': 'Link to the source',
	'settings.addSourceLink.desc': 'Adds a line like "- IMDb: <link>" at the end of the note.',
	'settings.defaultStatus.name': 'Default status',
	'settings.defaultStatus.desc': 'Status suggested in the form. Started is filled with today unless the status is backlog.',
	'settings.covers.heading': 'Covers',
	'settings.downloadCovers.name': 'Download covers by default',
	'settings.downloadCovers.desc':
		'Pre-selects "Download to attachments" in the form. The file is saved as <note>-cover.<ext> in the attachments folder.',
	'settings.sources.heading': 'Sources',
	'settings.bookSource.name': 'Book source',
	'settings.bookSource.desc':
		'Source selected first when searching books. Open Library needs no key and gives the first publication year; Google Books finds more editions in Portuguese but needs a key.',
	'settings.albumSource.name': 'Album source',
	'settings.albumSource.desc':
		'Source selected first when searching albums. MusicBrainz gives the year of the original release; iTunes has covers for more albums, but may give the year of a reissue. Neither needs a key.',
	'settings.albumIncludeEps.name': 'Include EPs',
	'settings.albumIncludeEps.desc': 'Album searches also list EPs. Singles are never listed.',
	'settings.albumIncludeSecondary.name': 'Include compilations and live albums',
	'settings.albumIncludeSecondary.desc':
		'MusicBrainz: also list compilations, live albums, remixes, DJ mixes and demos. Soundtracks are always listed.',
	'settings.albumItunesFallback.name': 'Covers from iTunes',
	'settings.albumItunesFallback.desc':
		'When the Cover Art Archive has no front cover for a MusicBrainz album, look for the album on iTunes and use its cover.',
	'settings.albumTracklist.name': 'Include the tracklist in albums',
	'settings.albumTracklist.desc':
		'New album notes get the numbered list of tracks, with durations, before "{impressions}". The tracks are fetched after you pick the album. Off: nothing is fetched.',
	'settings.albumTracksProperty.name': 'Number of tracks property',
	'settings.albumTracksProperty.desc': 'Also writes "tracks" with the number of tracks after "year" in new album notes, when the tracklist is known.',
	'settings.keys.heading': 'API keys',
	'settings.keys.desc':
		'Keys are kept in the keychain of Obsidian (settings, keychain). The plugin only stores which secret to use.',
	'settings.igdbClientId.name': 'IGDB client id',
	'settings.igdbClientId.desc': 'Game search. Register an app at dev.twitch.tv and pick the secret that holds its client id.',
	'settings.igdbClientSecret.name': 'IGDB client secret',
	'settings.igdbClientSecret.desc': 'Pick the secret that holds the client secret of the same Twitch app.',
	'settings.googleBooksKey.name': 'Google Books key',
	'settings.googleBooksKey.desc': 'Only for the Google Books source. Free: enable the Books API in the Google Cloud console.',

	// ---- note text (written into new notes, in the app language) -----------
	'note.tracks.heading': 'Tracks',
	'note.tracks.disc': 'Disc {n}',
} satisfies Messages;
