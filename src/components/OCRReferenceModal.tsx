/**
 * OCR Reference Modal Component
 * Full-screen viewer for OCR source image with zoom/pan (no crop functionality)
 */

import { useEffect } from 'react';
import ImageZoomPan from './ImageZoomPan';

interface OCRReferenceModalProps {
  imageDataUrl: string;
  onClose: () => void;
}

export default function OCRReferenceModal({
  imageDataUrl,
  onClose,
}: OCRReferenceModalProps) {
  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
      onClick={onClose}
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
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0 }}>OCR Reference Image</h2>
        </div>

        {/* Use shared ImageZoomPan component without crop controls */}
        <ImageZoomPan
          imageDataUrl={imageDataUrl}
          showCropControls={false}
          className="flex-1"
        />

        <div
          style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
