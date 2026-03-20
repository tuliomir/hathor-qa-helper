/**
 * Image Preview Component
 * Displays pasted image with zoom, pan, and crop functionality for OCR processing
 */

import ImageZoomPan from './ImageZoomPan';

interface ImagePreviewProps {
  imageDataUrl: string;
  onExtractText: (imageDataUrl: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export default function ImagePreview({ imageDataUrl, onExtractText, onCancel, isProcessing }: ImagePreviewProps) {
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
        </div>

        {/* Use shared ImageZoomPan component with crop controls */}
        <ImageZoomPan
          imageDataUrl={imageDataUrl}
          showCropControls={true}
          onExtract={onExtractText}
          isProcessing={isProcessing}
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
