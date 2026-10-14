/**
 * Image viewer with design-tool gestures, used by the crop modal and the
 * OCR reference image.
 *
 * - Drag on the image draws a selection (when `onCropChange` is given);
 *   drag inside it to move, drag a corner or edge to resize, click or Esc
 *   to clear.
 * - Two-finger scroll pans; pinch (ctrl+wheel, Safari gesture events) zooms
 *   around the cursor. Space+drag, middle-drag or the Pan tool pan.
 * - Native non-passive wheel/gesture listeners stop the page from scrolling
 *   or zooming while the pointer is over the image.
 *
 * Geometry lives in utils/imageViewport.ts. Rects are in image pixels.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MdAdd, MdCropFree, MdFitScreen, MdOpenWith, MdRemove } from 'react-icons/md';
import { SegmentedControl } from './ui/SegmentedControl';
import {
  clampRect,
  fitViewport,
  focusViewport,
  hitTestRect,
  imageRectToScreen,
  moveRect,
  panBy,
  rectFromPoints,
  resizeRect,
  screenToImage,
  wheelZoomFactor,
  zoomAt,
  type Handle,
  type Point,
  type Rect,
  type RectHit,
  type Size,
  type Viewport,
} from '../utils/imageViewport';

export type { Rect } from '../utils/imageViewport';

export interface ImageHighlight {
  rect: Rect;
  /** `error` outlines a problem; `focus` is the selected item, drawn strongest. */
  tone: 'error' | 'focus';
  label?: string;
}

interface ImageZoomPanProps {
  imageDataUrl: string;
  /** Selection in image pixels. Selecting is enabled when `onCropChange` is set. */
  crop?: Rect | null;
  onCropChange?: (crop: Rect | null) => void;
  highlights?: ImageHighlight[];
  /** Zooms and pans to centre this rect (image pixels) whenever it changes. */
  focus?: Rect | null;
  disabled?: boolean;
  /** Sizing of the viewport box, e.g. `h-[60vh]`. */
  viewportClassName?: string;
  className?: string;
  /** Extra controls at the right end of the toolbar. */
  toolbarEnd?: React.ReactNode;
  maxZoom?: number;
  minZoom?: number;
}

type Tool = 'select' | 'pan';

type Drag =
  | { kind: 'pan'; start: Point; startVp: Viewport }
  | { kind: 'draw'; start: Point; origin: Point; moved: boolean }
  | { kind: 'move'; start: Point; startRect: Rect }
  | { kind: 'resize'; start: Point; startRect: Rect; handle: Handle };

interface GestureEventLike extends UIEvent {
  scale: number;
  clientX: number;
  clientY: number;
}

const HANDLE_TOLERANCE = 8;
const FIT_PADDING = 16;
const CLICK_SLOP = 3;
const MIN_CROP = 4;
const CORNERS: Handle[] = ['nw', 'ne', 'sw', 'se'];

const isEditable = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export default function ImageZoomPan({
  imageDataUrl,
  crop = null,
  onCropChange,
  highlights = [],
  focus = null,
  disabled = false,
  viewportClassName = 'h-96',
  className = '',
  toolbarEnd,
  maxZoom = 10,
  minZoom = 0.05,
}: ImageZoomPanProps) {
  const selectable = !!onCropChange;
  const hintId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState<Size | null>(null);
  const [box, setBox] = useState<Size>({ width: 0, height: 0 });
  const [vp, setVp] = useState<Viewport>({ scale: 1, x: 0, y: 0 });
  const [tool, setTool] = useState<Tool>('select');
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [dragKind, setDragKind] = useState<Drag['kind'] | null>(null);
  const [hover, setHover] = useState<RectHit>(null);
  const [animate, setAnimate] = useState(false);

  const vpRef = useRef(vp);
  vpRef.current = vp;
  const dragRef = useRef<Drag | null>(null);
  const userMovedRef = useRef(false);
  const hoveredRef = useRef(false);

  // Load the image's natural size.
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      userMovedRef.current = false;
      setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = imageDataUrl;
    return () => {
      cancelled = true;
    };
  }, [imageDataUrl]);

  // Track the viewport box size.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = useCallback(() => {
    if (!imgSize) return;
    setVp(fitViewport(imgSize, box, FIT_PADDING, 1));
  }, [imgSize, box]);

  // Fit until the user moves the view themselves.
  const hasFocus = !!focus;
  useEffect(() => {
    if (!userMovedRef.current && !hasFocus) fit();
  }, [fit, hasFocus]);

  // Centre on `focus` whenever it changes.
  const focusKey = focus ? `${focus.x},${focus.y},${focus.width},${focus.height}` : '';
  useEffect(() => {
    if (!focus || !imgSize || box.width === 0) return;
    setAnimate(true);
    setVp(focusViewport(focus, box, 0.2, 2.5));
    userMovedRef.current = true;
    // focusKey stands in for `focus`, whose identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, imgSize, box]);

  const minScale = Math.min(minZoom, imgSize ? fitViewport(imgSize, box, FIT_PADDING, 1).scale : 1);

  const userMove = useCallback((update: (v: Viewport) => Viewport) => {
    userMovedRef.current = true;
    setAnimate(false);
    setVp(update);
  }, []);

  // Native listeners: React's onWheel is passive, so preventDefault there
  // would not stop the page from scrolling or pinch-zooming.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let gestureStart: Viewport | null = null;
    const local = (e: { clientX: number; clientY: number }): Point => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (disabled || gestureStart) return;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
      if (e.ctrlKey || e.metaKey) {
        // Pinch on a trackpad arrives as ctrl+wheel with small deltas; cap
        // mouse-wheel notches so one notch is a gentle step.
        const d = Math.max(-25, Math.min(25, e.deltaY * unit));
        const p = local(e);
        userMove((v) => zoomAt(v, p, wheelZoomFactor(d), minScale, maxZoom));
      } else {
        const dx = (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * unit;
        const dy = (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * unit;
        userMove((v) => panBy(v, -dx, -dy));
      }
    };
    // Safari pinch.
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      gestureStart = vpRef.current;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      if (disabled || !gestureStart) return;
      const g = e as GestureEventLike;
      const start = gestureStart;
      const p = local(g);
      userMove(() => zoomAt(start, p, g.scale, minScale, maxZoom));
    };
    const onGestureEnd = (e: Event) => {
      e.preventDefault();
      gestureStart = null;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('gesturestart', onGestureStart, { passive: false });
    el.addEventListener('gesturechange', onGestureChange, { passive: false });
    el.addEventListener('gestureend', onGestureEnd, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('gesturestart', onGestureStart);
      el.removeEventListener('gesturechange', onGestureChange);
      el.removeEventListener('gestureend', onGestureEnd);
    };
  }, [disabled, minScale, maxZoom, userMove]);

  // Space held while over (or focused on) the viewer switches to panning.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isEditable(e.target)) return;
      const focused = containerRef.current?.contains(document.activeElement);
      if (!hoveredRef.current && !focused) return;
      e.preventDefault();
      setSpaceHeld(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false);
    };
    const reset = () => setSpaceHeld(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', reset);
    };
  }, []);

  const localPoint = (e: React.PointerEvent): Point => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const panning = !selectable || tool === 'pan' || spaceHeld;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !imgSize || (e.button !== 0 && e.button !== 1)) return;
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
    e.currentTarget.setPointerCapture(e.pointerId);
    setAnimate(false);
    const p = localPoint(e);

    let drag: Drag;
    if (panning || e.button === 1) {
      drag = { kind: 'pan', start: p, startVp: vp };
    } else {
      const hit = crop ? hitTestRect(vp, crop, p, HANDLE_TOLERANCE) : null;
      if (crop && hit === 'inside') drag = { kind: 'move', start: p, startRect: crop };
      else if (crop && hit && hit !== 'inside') drag = { kind: 'resize', start: p, startRect: crop, handle: hit };
      else drag = { kind: 'draw', start: p, origin: screenToImage(vp, p), moved: false };
    }
    dragRef.current = drag;
    setDragKind(drag.kind);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = localPoint(e);
    const drag = dragRef.current;
    if (!drag) {
      setHover(selectable && !panning && crop ? hitTestRect(vp, crop, p, HANDLE_TOLERANCE) : null);
      return;
    }
    if (!imgSize) return;
    const dx = p.x - drag.start.x;
    const dy = p.y - drag.start.y;
    switch (drag.kind) {
      case 'pan':
        userMove(() => ({ ...drag.startVp, x: drag.startVp.x + dx, y: drag.startVp.y + dy }));
        break;
      case 'draw':
        if (!drag.moved && Math.hypot(dx, dy) < CLICK_SLOP) return;
        drag.moved = true;
        onCropChange?.(clampRect(rectFromPoints(drag.origin, screenToImage(vp, p)), imgSize));
        break;
      case 'move':
        onCropChange?.(moveRect(drag.startRect, dx / vp.scale, dy / vp.scale, imgSize));
        break;
      case 'resize':
        onCropChange?.(resizeRect(drag.startRect, drag.handle, screenToImage(vp, p), imgSize));
        break;
    }
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragKind(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!drag || cancelled) return;
    if (drag.kind === 'draw' && !drag.moved) {
      onCropChange?.(null); // a click clears the selection
    } else if ((drag.kind === 'draw' || drag.kind === 'resize') && crop) {
      if (crop.width < MIN_CROP || crop.height < MIN_CROP) onCropChange?.(null);
    }
  };

  const zoomBy = (factor: number) =>
    userMove((v) => zoomAt(v, { x: box.width / 2, y: box.height / 2 }, factor, minScale, maxZoom));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const step = 40;
    switch (e.key) {
      case 'Escape':
        if (selectable && crop) {
          e.stopPropagation(); // clear the selection, don't close the dialog
          onCropChange?.(null);
        }
        return;
      case '+':
      case '=':
        zoomBy(1.25);
        break;
      case '-':
        zoomBy(0.8);
        break;
      case '0':
        userMovedRef.current = false;
        fit();
        break;
      case 'ArrowLeft':
        userMove((v) => panBy(v, step, 0));
        break;
      case 'ArrowRight':
        userMove((v) => panBy(v, -step, 0));
        break;
      case 'ArrowUp':
        userMove((v) => panBy(v, 0, step));
        break;
      case 'ArrowDown':
        userMove((v) => panBy(v, 0, -step));
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const cursor = (() => {
    if (disabled) return 'default';
    if (dragKind === 'pan') return 'grabbing';
    if (panning) return 'grab';
    if (dragKind === 'move' || hover === 'inside') return 'move';
    const handle = dragKind === 'resize' ? (dragRef.current as { handle: Handle }).handle : hover;
    if (handle) return `${handle}-resize`;
    return 'crosshair';
  })();

  const transition = animate ? 'transition-all duration-300 ease-out' : '';
  const cropScreen = crop ? imageRectToScreen(vp, crop) : null;
  const hasCrop = !!cropScreen && crop!.width > 0 && crop!.height > 0;

  const hint = selectable
    ? 'Drag to select the words · two-finger scroll to pan · pinch to zoom · hold Space and drag to pan · click or Esc clears the selection'
    : 'Drag or two-finger scroll to pan · pinch or Ctrl + scroll to zoom';

  return (
    <div className={`flex min-h-0 flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {selectable && (
          <SegmentedControl<Tool>
            aria-label="Pointer tool"
            size="sm"
            value={spaceHeld ? 'pan' : tool}
            onChange={setTool}
            disabled={disabled}
            options={[
              { value: 'select', label: 'Select', icon: <MdCropFree aria-hidden="true" /> },
              { value: 'pan', label: 'Pan', icon: <MdOpenWith aria-hidden="true" /> },
            ]}
          />
        )}
        <div className="join">
          <button
            type="button"
            onClick={() => zoomBy(0.8)}
            disabled={disabled}
            className="btn btn-sm join-item"
            aria-label="Zoom out"
          >
            <MdRemove aria-hidden="true" />
          </button>
          <span className="join-item flex min-w-14 items-center justify-center border-y border-base-300 bg-base-100 px-2 font-mono text-data-sm tabular-nums">
            {Math.round(vp.scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => zoomBy(1.25)}
            disabled={disabled}
            className="btn btn-sm join-item"
            aria-label="Zoom in"
          >
            <MdAdd aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            userMovedRef.current = false;
            setAnimate(true);
            fit();
          }}
          disabled={disabled}
          className="btn btn-ghost btn-sm"
        >
          <MdFitScreen aria-hidden="true" />
          Fit
        </button>
        {selectable && hasCrop && (
          <button
            type="button"
            onClick={() => onCropChange?.(null)}
            disabled={disabled}
            className="btn btn-ghost btn-sm"
          >
            Clear selection
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          {imgSize && (
            <span className="font-mono text-data-sm text-ink-muted">
              {hasCrop ? `${Math.round(crop!.width)} × ${Math.round(crop!.height)} of ` : ''}
              {imgSize.width} × {imgSize.height}
            </span>
          )}
          {toolbarEnd}
        </div>
      </div>

      <div
        ref={containerRef}
        role="application"
        aria-roledescription="image viewer"
        aria-label={selectable ? 'Image. Drag to select the seed words.' : 'Image'}
        aria-describedby={hintId}
        tabIndex={0}
        data-testid="image-viewport"
        className={`relative min-h-0 touch-none select-none overflow-hidden rounded-field border border-base-300 bg-base-200 outline-none focus-visible:ring-2 focus-visible:ring-primary ${viewportClassName}`}
        style={{ cursor }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => endDrag(e, false)}
        onPointerCancel={(e) => endDrag(e, true)}
        onPointerEnter={() => (hoveredRef.current = true)}
        onPointerLeave={() => {
          hoveredRef.current = false;
          if (!dragRef.current) setHover(null);
        }}
        onKeyDown={handleKeyDown}
      >
        {imgSize && (
          <img
            src={imageDataUrl}
            alt=""
            draggable={false}
            className={`pointer-events-none absolute left-0 top-0 max-w-none origin-top-left ${transition}`}
            style={{
              width: imgSize.width,
              height: imgSize.height,
              transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.scale})`,
            }}
          />
        )}

        {highlights.map((h, i) => {
          const s = imageRectToScreen(vp, h.rect);
          const isFocus = h.tone === 'focus';
          return (
            <div
              key={`${h.label ?? ''}-${i}`}
              data-highlight={h.tone}
              data-label={h.label}
              className={`pointer-events-none absolute rounded-sm ${transition} ${
                isFocus ? 'z-10 border-[3px] border-primary ring-2 ring-base-100' : 'border-2 border-error'
              }`}
              style={{ left: s.x - 3, top: s.y - 3, width: s.width + 6, height: s.height + 6 }}
            >
              {h.label && (
                <span
                  className={`absolute -top-5 left-[-3px] rounded-sm px-1 font-mono text-data-sm leading-4 ${
                    isFocus ? 'bg-primary text-primary-content' : 'bg-error text-error-content'
                  }`}
                >
                  {h.label}
                </span>
              )}
            </div>
          );
        })}

        {hasCrop && cropScreen && (
          <div
            data-testid="crop-rect"
            className="pointer-events-none absolute border-2 border-dashed border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
            style={{ left: cropScreen.x, top: cropScreen.y, width: cropScreen.width, height: cropScreen.height }}
          >
            {CORNERS.map((c) => (
              <span
                key={c}
                className={`absolute size-2.5 rounded-sm border-2 border-primary bg-base-100 ${
                  c.includes('n') ? '-top-[6px]' : '-bottom-[6px]'
                } ${c.includes('w') ? '-left-[6px]' : '-right-[6px]'}`}
              />
            ))}
          </div>
        )}
      </div>

      <p id={hintId} className="m-0 text-caption text-ink-muted">
        {hint}
      </p>
    </div>
  );
}
