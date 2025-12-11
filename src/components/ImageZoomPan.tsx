/**
 * Reusable Image Zoom/Pan Component
 * Provides canvas-based image rendering with zoom, pan, and optional crop functionality
 * Used by both ImagePreview and OCR reference components
 */

import { useState, useRef, useEffect, useCallback } from 'react';

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageZoomPanProps {
  imageDataUrl: string;
  showCropControls?: boolean;
  onExtract?: (imageDataUrl: string) => void;
  isProcessing?: boolean;
  className?: string;
  maxZoom?: number;
  minZoom?: number;
}

export default function ImageZoomPan({
  imageDataUrl,
  showCropControls = false,
  onExtract,
  isProcessing = false,
  className = '',
  maxZoom = 10,
  minZoom = 0.1,
}: ImageZoomPanProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropRect, setCropRect] = useState<Rectangle | null>(null);
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      // Reset zoom to fit image in container
      if (containerRef.current) {
        const container = containerRef.current;
        const scaleX = (container.clientWidth - 40) / img.width;
        const scaleY = (container.clientHeight - 40) / img.height;
        const initialZoom = Math.min(scaleX, scaleY, 1);
        setZoom(initialZoom);
      }
    };
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !image || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Clear canvas
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate image position (centered)
    const imageWidth = image.width * zoom;
    const imageHeight = image.height * zoom;
    const x = (canvas.width - imageWidth) / 2 + pan.x;
    const y = (canvas.height - imageHeight) / 2 + pan.y;

    // Draw image
    ctx.drawImage(image, x, y, imageWidth, imageHeight);

    // Draw crop rectangle if enabled and exists
    if (showCropControls && cropRect) {
      ctx.strokeStyle = '#007bff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        x + cropRect.x * zoom,
        y + cropRect.y * zoom,
        cropRect.width * zoom,
        cropRect.height * zoom
      );

      // Semi-transparent overlay outside crop area
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.setLineDash([]);

      // Top
      ctx.fillRect(0, 0, canvas.width, y + cropRect.y * zoom);
      // Bottom
      ctx.fillRect(
        0,
        y + (cropRect.y + cropRect.height) * zoom,
        canvas.width,
        canvas.height - (y + (cropRect.y + cropRect.height) * zoom)
      );
      // Left
      ctx.fillRect(0, y + cropRect.y * zoom, x + cropRect.x * zoom, cropRect.height * zoom);
      // Right
      ctx.fillRect(
        x + (cropRect.x + cropRect.width) * zoom,
        y + cropRect.y * zoom,
        canvas.width - (x + (cropRect.x + cropRect.width) * zoom),
        cropRect.height * zoom
      );
    }
  }, [image, zoom, pan, cropRect, showCropControls]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle mouse down for pan/crop
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !image) return;

    // Prevent drag-and-drop behavior
    e.preventDefault();

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (showCropControls && e.shiftKey) {
      // Start drawing crop rectangle
      setIsDrawingCrop(true);
      const imageWidth = image.width * zoom;
      const imageHeight = image.height * zoom;
      const imageX = (canvas.width - imageWidth) / 2 + pan.x;
      const imageY = (canvas.height - imageHeight) / 2 + pan.y;
      setCropStart({ x: (x - imageX) / zoom, y: (y - imageY) / zoom });
    } else {
      // Start panning
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !image) return;

    // Prevent drag-and-drop behavior when dragging
    if (isDragging || isDrawingCrop) {
      e.preventDefault();
    }

    if (showCropControls && isDrawingCrop) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const imageWidth = image.width * zoom;
      const imageHeight = image.height * zoom;
      const imageX = (canvas.width - imageWidth) / 2 + pan.x;
      const imageY = (canvas.height - imageHeight) / 2 + pan.y;

      const currentX = (x - imageX) / zoom;
      const currentY = (y - imageY) / zoom;

      const rectX = Math.min(cropStart.x, currentX);
      const rectY = Math.min(cropStart.y, currentY);
      const rectWidth = Math.abs(currentX - cropStart.x);
      const rectHeight = Math.abs(currentY - cropStart.y);

      // Clamp to image boundaries
      const clampedX = Math.max(0, Math.min(rectX, image.width));
      const clampedY = Math.max(0, Math.min(rectY, image.height));
      const clampedWidth = Math.min(rectWidth, image.width - clampedX);
      const clampedHeight = Math.min(rectHeight, image.height - clampedY);

      setCropRect({
        x: clampedX,
        y: clampedY,
        width: clampedWidth,
        height: clampedHeight,
      });
    } else if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDrawingCrop(false);
  };

  // Handle wheel zoom (including middle button)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    // Prevent page scroll and event bubbling
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(minZoom, Math.min(prev * delta, maxZoom)));
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.2, maxZoom));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.2, minZoom));

  const handleResetView = () => {
    if (!image || !containerRef.current) return;
    const container = containerRef.current;
    const scaleX = (container.clientWidth - 40) / image.width;
    const scaleY = (container.clientHeight - 40) / image.height;
    const initialZoom = Math.min(scaleX, scaleY, 1);
    setZoom(initialZoom);
    setPan({ x: 0, y: 0 });
    if (showCropControls) {
      setCropRect(null);
    }
  };

  const handleClearCrop = () => {
    if (showCropControls) {
      setCropRect(null);
    }
  };

  const handleExtract = () => {
    if (!image || !onExtract) return;

    let imageToProcess = imageDataUrl;

    // If crop rectangle exists and crop controls are enabled, extract cropped region
    if (showCropControls && cropRect && cropRect.width > 0 && cropRect.height > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = cropRect.width;
      canvas.height = cropRect.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(
          image,
          cropRect.x,
          cropRect.y,
          cropRect.width,
          cropRect.height,
          0,
          0,
          cropRect.width,
          cropRect.height
        );
        imageToProcess = canvas.toDataURL();
      }
    }

    onExtract(imageToProcess);
  };

  return (
    <div className={`flex flex-col gap-4 h-full ${className}`}>
      {/* Image info */}
      {image && (
        <div className="flex justify-between items-center text-sm text-muted">
          <span>
            {image.width} × {image.height}
          </span>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
        </div>
      )}

      {/* Zoom controls */}
      <div className="flex gap-2 items-center flex-wrap">
        <button
          onClick={handleZoomOut}
          disabled={isProcessing}
          className="btn btn-secondary text-xs px-3 py-1"
        >
          Zoom Out
        </button>
        <button
          onClick={handleZoomIn}
          disabled={isProcessing}
          className="btn btn-secondary text-xs px-3 py-1"
        >
          Zoom In
        </button>
        <button
          onClick={handleResetView}
          disabled={isProcessing}
          className="btn btn-secondary text-xs px-3 py-1"
        >
          Reset View
        </button>
        {showCropControls && cropRect && (
          <button
            onClick={handleClearCrop}
            disabled={isProcessing}
            className="btn btn-warning text-xs px-3 py-1"
          >
            Clear Crop
          </button>
        )}
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="flex-1 border-2 border-gray-300 rounded overflow-hidden relative bg-gray-100"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{
            cursor: isDrawingCrop ? 'crosshair' : isDragging ? 'grabbing' : 'grab',
            display: 'block',
          }}
        />
      </div>

      {/* Instructions */}
      <div className="text-xs text-center text-muted">
        Drag to pan • Scroll to zoom
        {showCropControls && ' • Hold Shift and drag to crop'}
      </div>

      {/* Extract button (only if onExtract callback provided) */}
      {onExtract && (
        <button
          onClick={handleExtract}
          disabled={isProcessing}
          className={`btn text-sm font-bold ${
            isProcessing ? 'btn-secondary cursor-not-allowed' : 'btn-primary'
          }`}
        >
          {isProcessing ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Processing...
            </>
          ) : (
            `Extract Seed Words${showCropControls && cropRect ? ' (Cropped)' : ''}`
          )}
        </button>
      )}
    </div>
  );
}
