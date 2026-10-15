# Canvas Shapes extensions to JSON Canvas — format version 1

A `.canvas` file with these extensions is a plain [JSON Canvas 1.0](https://jsoncanvas.org/spec/1.0/) file. The extensions live in a `canvasShapes` object on the root, on nodes and on edges. JSON Canvas asks readers to keep keys they do not know, so an app that ignores the extensions still opens the file, shows shapes as rectangles and lines as solid lines, and saves the extensions back untouched (Obsidian does).

Schemas (JSON Schema 2020-12):

- [`schema/canvas-shapes-1.schema.json`](schema/canvas-shapes-1.schema.json) — JSON Canvas plus the extensions.
- [`schema/json-canvas-1.0.schema.json`](schema/json-canvas-1.0.schema.json) — JSON Canvas 1.0 alone, transcribed from the [official spec](https://github.com/obsidianmd/jsoncanvas/blob/456f843cb293df4f4ab1763e22ccb46a80b307c8/spec/1.0.md) (the project publishes no schema file).

## Example

```json
{
  "canvasShapes": { "version": 1 },
  "nodes": [
    { "id": "api", "type": "text", "text": "API", "x": -260, "y": 0, "width": 160, "height": 120 },
    {
      "id": "db", "type": "text", "text": "Postgres",
      "x": 0, "y": 0, "width": 160, "height": 120,
      "canvasShapes": { "shape": "cylinder" }
    }
  ],
  "edges": [
    {
      "id": "e1", "fromNode": "api", "toNode": "db", "toEnd": "arrow",
      "canvasShapes": { "line": "dashed", "width": 2 }
    }
  ]
}
```

## Root

| Key | Type | Meaning |
|---|---|---|
| `canvasShapes.version` | integer ≥ 1 | Version of this format the file was written with. Writers set it when a file first uses an extension. Readers treat a file with extensions and no version as version 1. |

## Nodes

| Key | Values | Default |
|---|---|---|
| `canvasShapes.shape` | `rectangle`, `square`, `circle`, `diamond`, `cylinder` | `rectangle` |

- Applies to `text`, `file` and `link` nodes. Groups are always rectangles; readers ignore `shape` on groups.
- `square` and `circle` are drawn in the node's box; editors keep these nodes 1:1. A `circle` in a box that is not square is drawn as an ellipse.
- `cylinder` is a database symbol: an ellipse on top, curved bottom.
- Content goes in the largest box inside the shape: the whole node for rectangles and squares (top-left, as in Obsidian), the inscribed rectangle for circles and diamonds, and the body below the top ellipse for cylinders (centered).

## Edges

| Key | Values | Default |
|---|---|---|
| `canvasShapes.line` | `solid`, `dashed`, `dotted` | `solid` |
| `canvasShapes.width` | number > 0, in canvas pixels | `2` |

- Dashes scale with the width: `dashed` is a dash of `3 × width + 4` and a gap of `2 × width + 4`; `dotted` is round dots every `width + 4`.
- Arrowheads grow with the width (`max(1, (width + 2) / 4)` times the 13 × 10.4 px default).
- Readers may clamp very thin or very thick lines (this renderer uses 0.5 to 32).

## Rules for readers and writers

- **Values are data**: the English strings above, never translated.
- **Unknown values fall back to the default** (an unknown shape draws a rectangle). Unknown keys inside `canvasShapes` are kept by writers and ignored by readers, so newer files survive older apps.
- **Defaults are not written**: setting a node back to `rectangle` removes `shape`; an empty `canvasShapes` object is removed from the node or edge.
- No new node or edge types: everything else is standard JSON Canvas.
