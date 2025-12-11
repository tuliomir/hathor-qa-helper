/**
 * OCR Reference Image Thumbnail Component
 * Displays clickable thumbnail of OCR source image with inline zoom capability
 */

import { useState } from 'react';
import { MdZoomIn, MdClose } from 'react-icons/md';

interface OCRReferenceImageProps {
  imageDataUrl: string;
  onExpand: () => void;
  onDismiss: () => void;
}

export default function OCRReferenceImage({
  imageDataUrl,
  onExpand,
  onDismiss,
}: OCRReferenceImageProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Handle wheel zoom (including middle button)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Prevent page scroll and event bubbling
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.5, Math.min(prev * delta, 3)));
  };

  // Handle pan when zoomed
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom > 1) {
      e.preventDefault(); // Prevent drag-and-drop behavior
      e.stopPropagation();
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      e.preventDefault(); // Prevent drag-and-drop behavior
      e.stopPropagation();
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    // Only expand if not dragging and zoom is at default
    if (!isDragging && zoom === 1) {
      onExpand();
    }
  };

  const handleDismissClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onDismiss();
  };

  return (
    <div className="relative group">
      {/* Image container */}
      <div
        className="border-2 border-primary rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-gray-100 relative"
        style={{ maxHeight: '300px' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setIsHovered(false);
        }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
      >
        <div
          className="overflow-hidden flex items-center justify-center"
          style={{ maxHeight: '300px', minHeight: '150px' }}
        >
          <img
            src={imageDataUrl}
            alt="OCR source"
            className="max-w-full max-h-[300px] object-contain"
            draggable={false}
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
              transformOrigin: 'center center',
              userSelect: 'none',
            }}
            onError={(e) => {
              console.error('Failed to load OCR reference image');
              e.currentTarget.src =
                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="100"%3E%3Crect fill="%23f0f0f0" width="200" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999"%3EImage unavailable%3C/text%3E%3C/svg%3E';
            }}
          />
        </div>

        {/* Overlay indicators */}
        <div className="absolute top-2 right-2 flex gap-2">
          {/* Expand icon - shown on hover when at default zoom */}
          {isHovered && zoom === 1 && (
            <div className="bg-primary text-white p-2 rounded-full shadow-lg transition-opacity">
              <MdZoomIn size={20} />
            </div>
          )}

          {/* Close button - always visible */}
          <button
            onClick={handleDismissClick}
            className="bg-danger text-white p-2 rounded-full shadow-lg hover:bg-red-700 transition-colors"
            aria-label="Dismiss OCR reference image"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Zoom level indicator */}
        {zoom !== 1 && (
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
            {Math.round(zoom * 100)}%
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center text-xs text-muted mt-2">
        {zoom === 1 ? (
          <>Click to expand • Scroll to zoom</>
        ) : (
          <>Drag to pan • Scroll to zoom • Click to expand</>
        )}
      </div>
    </div>
  );
}
