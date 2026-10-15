import { Creator } from '../canvas/creator';
import type { CanvasSession, SessionUi } from '../canvas/session';
import type { PluginHost } from '../host';
import { Panel } from './panel';
import { Toolbar } from './toolbar';

/**
 * The interfaces of one canvas: the properties toolbar always, the elements panel when the
 * canvas offers the creation methods it needs (otherwise only the panel is off, with a notice).
 */
export function createSessionUi(session: CanvasSession, host: PluginHost): SessionUi[] {
	const uis: SessionUi[] = [new Toolbar(session)];
	const creation = host.shapes.detectCreation(session.canvas);
	if (creation.ok) uis.push(new Panel(session, host, new Creator(session, creation.canvas)));
	else host.shapes.panelUnsupported(creation.reason);
	return uis;
}
