/**
 * Image Preview Component
 * Displays pasted image and allows user to frame/preview before OCR processing
 */

import { useState, useRef, useEffect } from 'react';

interface ImagePreviewProps {
  imageDataUrl: string;
  onExtractText: (imageDataUrl: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export default function ImagePreview({
  imageDataUrl,
  onExtractText,
  onCancel,
  isProcessing,
}: ImagePreviewProps) {
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imageRef.current) {
      const img = imageRef.current;
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    }
  }, [imageDataUrl]);

  const handleExtract = () => {
    onExtractText(imageDataUrl);
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
          maxWidth: '90%',
          maxHeight: '90%',
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
          <h2 style={{ margin: 0 }}>Preview Image</h2>
          <div style={{ fontSize: '14px', color: '#6c757d' }}>
            {imageDimensions.width} × {imageDimensions.height}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            border: '2px solid #dee2e6',
            borderRadius: '4px',
            padding: '10px',
            backgroundColor: '#f8f9fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            maxHeight: '60vh',
          }}
        >
          <img
            ref={imageRef}
            src={imageDataUrl}
            alt="Preview"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        </div>

        <div style={{ fontSize: '14px', color: '#6c757d', textAlign: 'center' }}>
          Position the seed words clearly in the image for best results
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
              'Extract Seed Words'
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
