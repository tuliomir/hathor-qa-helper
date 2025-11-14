/**
 * Image Preview Component
 * Displays pasted image with zoom, pan, and crop functionality for OCR processing
 */

import { useState, useRef, useEffect, useCallback } from 'react';

interface ImagePreviewProps {
  imageDataUrl: string;
  onExtractText: (imageDataUrl: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ImagePreview({
  imageDataUrl,
  onExtractText,
  onCancel,
  isProcessing,
}: ImagePreviewProps) {
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

    // Draw crop rectangle if exists
    if (cropRect) {
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
  }, [image, zoom, pan, cropRect]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle mouse down for pan/crop
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !image) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (e.shiftKey) {
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

    if (isDrawingCrop) {
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

  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.2, 10));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.2, 0.1));
  const handleResetView = () => {
    if (!image || !containerRef.current) return;
    const container = containerRef.current;
    const scaleX = (container.clientWidth - 40) / image.width;
    const scaleY = (container.clientHeight - 40) / image.height;
    const initialZoom = Math.min(scaleX, scaleY, 1);
    setZoom(initialZoom);
    setPan({ x: 0, y: 0 });
    setCropRect(null);
  };

  const handleClearCrop = () => setCropRect(null);

  const handleExtract = async () => {
    if (!image) return;

    let imageToProcess = imageDataUrl;

    // If crop rectangle exists, extract cropped region
    if (cropRect && cropRect.width > 0 && cropRect.height > 0) {
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

    onExtractText(imageToProcess);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          width: '90%',
          height: '90%',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0 }}>Preview and Crop Image</h2>
          {image && (
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              {image.width} × {image.height} ({Math.round(zoom * 100)}%)
            </div>
          )}
        </div>

        {/* Zoom controls */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
          }}
        >
          <button
            onClick={handleZoomOut}
            disabled={isProcessing}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
            }}
          >
            Zoom Out
          </button>
          <button
            onClick={handleZoomIn}
            disabled={isProcessing}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
            }}
          >
            Zoom In
          </button>
          <button
            onClick={handleResetView}
            disabled={isProcessing}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
            }}
          >
            Reset View
          </button>
          {cropRect && (
            <button
              onClick={handleClearCrop}
              disabled={isProcessing}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: '#ffc107',
                color: 'black',
                border: 'none',
                borderRadius: '4px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
              }}
            >
              Clear Crop
            </button>
          )}
        </div>

        {/* Canvas container */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            border: '2px solid #dee2e6',
            borderRadius: '4px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              cursor: isDrawingCrop ? 'crosshair' : isDragging ? 'grabbing' : 'grab',
              display: 'block',
            }}
          />
        </div>

        <div style={{ fontSize: '14px', color: '#6c757d', textAlign: 'center' }}>
          Drag to pan • Hold <strong>Shift</strong> and drag to select crop area • Zoom to adjust size
        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onCancel}
            disabled={isProcessing}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExtract}
            disabled={isProcessing}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 'bold',
              backgroundColor: isProcessing ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {isProcessing ? (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid white',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                Processing...
              </>
            ) : (
              `Extract Seed Words${cropRect ? ' (Cropped)' : ''}`
            )}
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
