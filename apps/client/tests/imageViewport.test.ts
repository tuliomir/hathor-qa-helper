import { describe, expect, test } from 'bun:test';
import {
  clampRect,
  fitViewport,
  focusViewport,
  hitTestRect,
  imageRectToScreen,
  imageToScreen,
  moveRect,
  panBy,
  rectFromPoints,
  resizeRect,
  screenToImage,
  wheelZoomFactor,
  zoomAt,
  type Viewport,
} from '../src/utils/imageViewport';

const vp: Viewport = { scale: 2, x: 10, y: 20 };

describe('imageViewport coordinate transforms', () => {
  test('imageToScreen scales then offsets', () => {
    expect(imageToScreen(vp, { x: 5, y: 5 })).toEqual({ x: 20, y: 30 });
  });

  test('screenToImage is the inverse of imageToScreen', () => {
    const p = { x: 123, y: 45 };
    const back = imageToScreen(vp, screenToImage(vp, p));
    expect(back.x).toBeCloseTo(p.x);
    expect(back.y).toBeCloseTo(p.y);
  });

  test('imageRectToScreen maps origin and size', () => {
    expect(imageRectToScreen(vp, { x: 1, y: 2, width: 3, height: 4 })).toEqual({
      x: 12,
      y: 24,
      width: 6,
      height: 8,
    });
  });
});

describe('fitViewport', () => {
  test('centres a small image without upscaling past maxScale', () => {
    const v = fitViewport({ width: 100, height: 50 }, { width: 400, height: 300 }, 0, 1);
    expect(v.scale).toBe(1);
    expect(v.x).toBe(150);
    expect(v.y).toBe(125);
  });

  test('scales a large image down to fit inside the padding', () => {
    const v = fitViewport({ width: 1000, height: 500 }, { width: 520, height: 520 }, 10, 1);
    expect(v.scale).toBe(0.5);
    expect(v.x).toBe(10);
    expect(v.y).toBe(135);
  });

  test('returns scale 1 at the origin for an empty container', () => {
    expect(fitViewport({ width: 10, height: 10 }, { width: 0, height: 0 })).toEqual({ scale: 1, x: 0, y: 0 });
  });
});

describe('zoomAt', () => {
  test('keeps the image point under the cursor fixed', () => {
    const cursor = { x: 200, y: 100 };
    const before = screenToImage(vp, cursor);
    const next = zoomAt(vp, cursor, 1.5, 0.1, 10);
    expect(next.scale).toBe(3);
    const after = screenToImage(next, cursor);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  test('clamps the scale to min and max', () => {
    expect(zoomAt(vp, { x: 0, y: 0 }, 100, 0.1, 4).scale).toBe(4);
    expect(zoomAt(vp, { x: 0, y: 0 }, 0.0001, 0.5, 4).scale).toBe(0.5);
  });

  test('returns the same viewport when the clamped scale does not change', () => {
    const atMax: Viewport = { scale: 4, x: 3, y: 3 };
    expect(zoomAt(atMax, { x: 50, y: 50 }, 2, 0.1, 4)).toEqual(atMax);
  });
});

describe('panBy', () => {
  test('moves the offset by the delta', () => {
    expect(panBy(vp, -5, 7)).toEqual({ scale: 2, x: 5, y: 27 });
  });
});

describe('wheelZoomFactor', () => {
  test('zooms in for negative delta and out for positive', () => {
    expect(wheelZoomFactor(-10)).toBeGreaterThan(1);
    expect(wheelZoomFactor(10)).toBeLessThan(1);
    expect(wheelZoomFactor(0)).toBe(1);
  });

  test('opposite deltas cancel out', () => {
    expect(wheelZoomFactor(30) * wheelZoomFactor(-30)).toBeCloseTo(1);
  });
});

describe('rectFromPoints and clampRect', () => {
  test('normalizes a rectangle dragged up and to the left', () => {
    expect(rectFromPoints({ x: 10, y: 20 }, { x: 4, y: 5 })).toEqual({ x: 4, y: 5, width: 6, height: 15 });
  });

  test('clamps a rectangle to the image bounds', () => {
    expect(clampRect({ x: -5, y: 10, width: 20, height: 100 }, { width: 50, height: 60 })).toEqual({
      x: 0,
      y: 10,
      width: 15,
      height: 50,
    });
  });

  test('a rectangle entirely outside the image collapses to zero size', () => {
    const r = clampRect({ x: 80, y: 80, width: 10, height: 10 }, { width: 50, height: 60 });
    expect(r.width).toBe(0);
    expect(r.height).toBe(0);
  });
});

describe('hitTestRect', () => {
  const rect = { x: 10, y: 10, width: 40, height: 20 }; // image coords
  const identity: Viewport = { scale: 1, x: 0, y: 0 };

  test('finds corner handles within the tolerance', () => {
    expect(hitTestRect(identity, rect, { x: 11, y: 9 }, 6)).toBe('nw');
    expect(hitTestRect(identity, rect, { x: 50, y: 10 }, 6)).toBe('ne');
    expect(hitTestRect(identity, rect, { x: 10, y: 30 }, 6)).toBe('sw');
    expect(hitTestRect(identity, rect, { x: 52, y: 31 }, 6)).toBe('se');
  });

  test('finds edges between the corners', () => {
    expect(hitTestRect(identity, rect, { x: 30, y: 10 }, 6)).toBe('n');
    expect(hitTestRect(identity, rect, { x: 30, y: 31 }, 6)).toBe('s');
    expect(hitTestRect(identity, rect, { x: 9, y: 20 }, 6)).toBe('w');
    expect(hitTestRect(identity, rect, { x: 50, y: 20 }, 6)).toBe('e');
  });

  test('reports inside and outside', () => {
    expect(hitTestRect(identity, rect, { x: 30, y: 20 }, 6)).toBe('inside');
    expect(hitTestRect(identity, rect, { x: 100, y: 100 }, 6)).toBeNull();
  });

  test('uses screen-space tolerance regardless of zoom', () => {
    const zoomed: Viewport = { scale: 4, x: 0, y: 0 };
    // nw corner on screen is (40, 40); 5px away still hits
    expect(hitTestRect(zoomed, rect, { x: 45, y: 40 }, 6)).toBe('nw');
    // 10px away (2.5 image px) does not
    expect(hitTestRect(zoomed, rect, { x: 50, y: 40 }, 6)).toBe('n');
  });
});

describe('resizeRect', () => {
  const rect = { x: 10, y: 10, width: 40, height: 20 };
  const bounds = { width: 100, height: 100 };

  test('dragging the se corner moves the opposite corner only', () => {
    expect(resizeRect(rect, 'se', { x: 70, y: 50 }, bounds)).toEqual({ x: 10, y: 10, width: 60, height: 40 });
  });

  test('dragging nw past se flips and normalizes', () => {
    expect(resizeRect(rect, 'nw', { x: 60, y: 40 }, bounds)).toEqual({ x: 50, y: 30, width: 10, height: 10 });
  });

  test('an edge handle changes one dimension', () => {
    expect(resizeRect(rect, 'e', { x: 80, y: 999 }, bounds)).toEqual({ x: 10, y: 10, width: 70, height: 20 });
    expect(resizeRect(rect, 'n', { x: 999, y: 0 }, bounds)).toEqual({ x: 10, y: 0, width: 40, height: 30 });
  });

  test('clamps to the image', () => {
    expect(resizeRect(rect, 'se', { x: 500, y: 500 }, bounds)).toEqual({ x: 10, y: 10, width: 90, height: 90 });
  });
});

describe('moveRect', () => {
  const bounds = { width: 100, height: 100 };

  test('moves by the delta', () => {
    expect(moveRect({ x: 10, y: 10, width: 20, height: 20 }, 5, -3, bounds)).toEqual({
      x: 15,
      y: 7,
      width: 20,
      height: 20,
    });
  });

  test('keeps the size and stops at the image edges', () => {
    expect(moveRect({ x: 10, y: 10, width: 20, height: 20 }, 500, -500, bounds)).toEqual({
      x: 80,
      y: 0,
      width: 20,
      height: 20,
    });
  });
});

describe('focusViewport', () => {
  test('centres the rectangle in the container', () => {
    const rect = { x: 100, y: 50, width: 20, height: 10 };
    const container = { width: 400, height: 200 };
    const v = focusViewport(rect, container, 0.4, 3);
    const centre = imageToScreen(v, { x: 110, y: 55 });
    expect(centre.x).toBeCloseTo(200);
    expect(centre.y).toBeCloseTo(100);
  });

  test('the rectangle fills at most the given fraction of the container', () => {
    const v = focusViewport({ x: 0, y: 0, width: 100, height: 10 }, { width: 400, height: 400 }, 0.5, 10);
    expect(v.scale).toBe(2);
  });

  test('caps the scale at maxScale', () => {
    const v = focusViewport({ x: 0, y: 0, width: 2, height: 2 }, { width: 400, height: 400 }, 0.5, 3);
    expect(v.scale).toBe(3);
  });
});
