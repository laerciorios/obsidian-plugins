/**
 * JSON Canvas 1.0 (https://jsoncanvas.org/spec/1.0/), as read from a file: every object keeps the
 * keys it does not know, as the spec requires for forward compatibility.
 */

export type NodeSide = 'top' | 'right' | 'bottom' | 'left';
export type EdgeEnd = 'none' | 'arrow';
export type BackgroundStyle = 'cover' | 'ratio' | 'repeat';

/** A preset ("1" to "6") or a hex color ("#FF0000"). */
export type CanvasColor = string;

interface NodeBase {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	color?: CanvasColor;
	[key: string]: unknown;
}

export interface TextNode extends NodeBase {
	type: 'text';
	text: string;
}

export interface FileNode extends NodeBase {
	type: 'file';
	file: string;
	/** A heading or block of the file, always starting with "#". */
	subpath?: string;
}

export interface LinkNode extends NodeBase {
	type: 'link';
	url: string;
}

export interface GroupNode extends NodeBase {
	type: 'group';
	label?: string;
	background?: string;
	backgroundStyle?: BackgroundStyle;
}

export type CanvasNode = TextNode | FileNode | LinkNode | GroupNode;

export interface CanvasEdge {
	id: string;
	fromNode: string;
	fromSide?: NodeSide;
	fromEnd?: EdgeEnd;
	toNode: string;
	toSide?: NodeSide;
	toEnd?: EdgeEnd;
	color?: CanvasColor;
	label?: string;
	[key: string]: unknown;
}

export interface CanvasData {
	nodes?: CanvasNode[];
	edges?: CanvasEdge[];
	[key: string]: unknown;
}

export interface Point {
	x: number;
	y: number;
}

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}
