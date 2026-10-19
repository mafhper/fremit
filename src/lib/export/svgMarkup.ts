/**
 * Repairs of the SVG markup Fabric hands us, applied before the file is
 * written. Kept as a pure string function so the repair is unit-testable
 * without a canvas.
 *
 * Fabric 7.2 serializes a rotated glyph that also carries inline styles as
 * `rotate="…"style="…"` — two attributes with no separator, which makes the
 * document unparsable (a browser refuses to decode it). A single space inside
 * a curved run is enough to hit it, because the space glyph always gets an
 * inline `white-space: pre;` style.
 *
 * The repair targets the missing separator, not the `rotate` case alone:
 * `TextSVGExportMixin._createTextCharSpan` builds the attribute list as
 * `${dySpan}${angleAttr}${fillStyles}` — the first two carry their own leading
 * or trailing space, the style block does not — so *any* attribute glued to
 * `style="` is the same defect (today measured on `rotate`; a hand-edited
 * value or a Fabric change would glue the next attribute the same way). In
 * well-formed markup the sequence cannot occur: it takes an attribute value
 * ending in a raw quote immediately followed by `style=`, and Fabric escapes
 * quotes in attribute values and text content (`escapeXml`). If Fabric fixes
 * the serializer upstream, this stops matching and becomes inert.
 */

const MISSING_ATTRIBUTE_SEPARATOR = /"style="/g;

export function repairFabricSvgAttributes(markup: string): string {
  return markup.replace(MISSING_ATTRIBUTE_SEPARATOR, '" style="');
}
