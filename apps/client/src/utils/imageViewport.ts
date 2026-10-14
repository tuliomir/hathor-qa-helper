/**
 * Pure geometry for the image viewer (ImageZoomPan): screen ↔ image
 * transforms, zoom around a point, crop rectangle editing and hit-testing.
 *
 * A viewport maps image pixels to container pixels:
 * `screen = image * scale + (x, y)`.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Viewport {
  scale: number;
  x: number;
  y: number;
}

export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
export type RectHit = Handle | 'inside' | null;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export function imageToScreen(vp: Viewport, p: Point): Point {
  return { x: p.x * vp.scale + vp.x, y: p.y * vp.scale + vp.y };
}

export function screenToImage(vp: Viewport, p: Point): Point {
  return { x: (p.x - vp.x) / vp.scale, y: (p.y - vp.y) / vp.scale };
}

export function imageRectToScreen(vp: Viewport, r: Rect): Rect {
  const { x, y } = imageToScreen(vp, r);
  return { x, y, width: r.width * vp.scale, height: r.height * vp.scale };
}

/** Viewport that shows the whole image centred, never above `maxScale`. */
export function fitViewport(image: Size, container: Size, padding = 0, maxScale = 1): Viewport {
  if (container.width <= 0 || container.height <= 0 || image.width <= 0 || image.height <= 0) {
    return { scale: 1, x: 0, y: 0 };
  }
  const scale = Math.min(
    (container.width - 2 * padding) / image.width,
    (container.height - 2 * padding) / image.height,
    maxScale
  );
  return {
    scale,
    x: (container.width - image.width * scale) / 2,
    y: (container.height - image.height * scale) / 2,
  };
}

/** Viewport that centres `rect`, filling at most `fraction` of the container. */
export function focusViewport(rect: Rect, container: Size, fraction = 0.5, maxScale = 4): Viewport {
  const scale = Math.min(
    (container.width * fraction) / Math.max(rect.width, 1),
    (container.height * fraction) / Math.max(rect.height, 1),
    maxScale
  );
  return {
    scale,
    x: container.width / 2 - (rect.x + rect.width / 2) * scale,
    y: container.height / 2 - (rect.y + rect.height / 2) * scale,
  };
}

/** Multiplies the scale by `factor`, keeping the image point under `anchor` fixed. */
export function zoomAt(vp: Viewport, anchor: Point, factor: number, minScale: number, maxScale: number): Viewport {
  const scale = clamp(vp.scale * factor, minScale, maxScale);
  if (scale === vp.scale) return vp;
  const imagePoint = screenToImage(vp, anchor);
  return { scale, x: anchor.x - imagePoint.x * scale, y: anchor.y - imagePoint.y * scale };
}

export function panBy(vp: Viewport, dx: number, dy: number): Viewport {
  return { scale: vp.scale, x: vp.x + dx, y: vp.y + dy };
}

/** Zoom factor for a pinch (`wheel` with ctrlKey) delta. Symmetric: f(d)·f(−d) = 1. */
export function wheelZoomFactor(deltaY: number): number {
  return Math.exp(-deltaY * 0.01);
}

export function rectFromPoints(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

export function clampRect(r: Rect, bounds: Size): Rect {
  const x0 = clamp(r.x, 0, bounds.width);
  const y0 = clamp(r.y, 0, bounds.height);
  const x1 = clamp(r.x + r.width, 0, bounds.width);
  const y1 = clamp(r.y + r.height, 0, bounds.height);
  return { x: x0, y: y0, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) };
}

/**
 * What part of `rect` (image coords) is under `p` (screen coords).
 * `tolerance` is in screen pixels so handles stay grabbable at any zoom.
 * Corners win over edges, edges over the inside.
 */
export function hitTestRect(vp: Viewport, rect: Rect, p: Point, tolerance: number): RectHit {
  const s = imageRectToScreen(vp, rect);
  const left = s.x;
  const right = s.x + s.width;
  const top = s.y;
  const bottom = s.y + s.height;
  const near = (a: number, b: number) => Math.abs(a - b) <= tolerance;
  const withinX = p.x >= left - tolerance && p.x <= right + tolerance;
  const withinY = p.y >= top - tolerance && p.y <= bottom + tolerance;
  if (!withinX || !withinY) return null;

  const nTop = near(p.y, top);
  const nBottom = near(p.y, bottom);
  const nLeft = near(p.x, left);
  const nRight = near(p.x, right);

  if (nTop && nLeft) return 'nw';
  if (nTop && nRight) return 'ne';
  if (nBottom && nLeft) return 'sw';
  if (nBottom && nRight) return 'se';
  if (nTop) return 'n';
  if (nBottom) return 's';
  if (nLeft) return 'w';
  if (nRight) return 'e';
  return 'inside';
}

/** Moves the edges named by `handle` to `p` (image coords), then normalizes and clamps. */
export function resizeRect(r: Rect, handle: Handle, p: Point, bounds: Size): Rect {
  let x0 = r.x;
  let y0 = r.y;
  let x1 = r.x + r.width;
  let y1 = r.y + r.height;
  if (handle.includes('n')) y0 = p.y;
  if (handle.includes('s')) y1 = p.y;
  if (handle.includes('w')) x0 = p.x;
  if (handle.includes('e')) x1 = p.x;
  return clampRect(rectFromPoints({ x: x0, y: y0 }, { x: x1, y: y1 }), bounds);
}

/** Moves the rectangle by (dx, dy) image pixels, keeping its size and staying inside the image. */
export function moveRect(r: Rect, dx: number, dy: number, bounds: Size): Rect {
  return {
    x: clamp(r.x + dx, 0, Math.max(0, bounds.width - r.width)),
    y: clamp(r.y + dy, 0, Math.max(0, bounds.height - r.height)),
    width: r.width,
    height: r.height,
  };
}
