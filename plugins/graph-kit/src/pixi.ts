/**
 * The slice of PIXI 7 (bundled by Obsidian as `window.PIXI` for the graph view) that Graph Kit
 * uses. No types ship with Obsidian, so these describe only what the features call; the
 * 'pixi' capability checks the constructors exist before any feature uses them.
 */

export interface PixiPoint {
	x: number;
	y: number;
	set(x: number, y?: number): void;
}

export interface PixiDisplayObject {
	x: number;
	y: number;
	alpha: number;
	visible: boolean;
	zIndex: number;
	eventMode: string;
	readonly scale: PixiPoint;
	readonly pivot: PixiPoint;
	parent: PixiContainer | null;
	readonly destroyed: boolean;
	mask: PixiDisplayObject | null;
	destroy(options?: { children?: boolean; texture?: boolean; baseTexture?: boolean }): void;
	removeFromParent(): void;
}

export interface PixiContainer extends PixiDisplayObject {
	addChild<T extends PixiDisplayObject>(child: T): T;
}

export interface PixiGraphics extends PixiContainer {
	tint: number;
	clear(): this;
	beginFill(color: number, alpha?: number): this;
	endFill(): this;
	lineStyle(width: number, color?: number, alpha?: number): this;
	drawCircle(x: number, y: number, radius: number): this;
	drawPolygon(points: number[]): this;
}

export interface PixiRectangle {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface PixiBaseTexture {
	readonly width: number;
	readonly height: number;
}

export interface PixiTexture {
	readonly width: number;
	readonly height: number;
	readonly baseTexture: PixiBaseTexture;
	/** The part of the base texture shown; also its `orig` unless given apart. */
	frame: PixiRectangle;
	updateUvs(): void;
	destroy(destroyBase?: boolean): void;
}

export interface PixiSprite extends PixiContainer {
	tint: number;
	width: number;
	height: number;
	texture: PixiTexture;
	readonly anchor: PixiPoint;
}

export interface PixiText extends PixiSprite {
	text: string;
}

export interface PixiTextStyle {
	fontSize?: number;
	fill?: number | string;
	fontFamily?: string;
}

export interface Pixi {
	Graphics: new () => PixiGraphics;
	Container: new () => PixiContainer;
	Sprite: new (texture?: PixiTexture) => PixiSprite;
	Text: new (text: string, style?: PixiTextStyle) => PixiText;
	Rectangle: new (x: number, y: number, width: number, height: number) => PixiRectangle;
	Texture: {
		new (base: PixiBaseTexture, frame: PixiRectangle): PixiTexture;
		from(source: HTMLCanvasElement | string): PixiTexture;
		WHITE: PixiTexture;
	};
}
