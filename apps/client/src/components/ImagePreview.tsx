/**
 * Crop dialog for OCR: shows the pasted/captured image in ImageZoomPan,
 * lets the user select the seed words and extracts from the selection
 * (or the whole image when nothing is selected).
 */

import { useState } from 'react';
import { MdTextSnippet } from 'react-icons/md';
import ImageZoomPan, { type Rect } from './ImageZoomPan';
import { Modal } from './ui/Modal';

interface ImagePreviewProps {
  imageDataUrl: string;
  onExtractText: (imageDataUrl: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

/** Copies `rect` (image pixels) of the image into a new PNG data URL. */
function cropImage(imageDataUrl: string, rect: Rect): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const x = Math.round(rect.x);
      const y = Math.round(rect.y);
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = imageDataUrl;
  });
}

export default function ImagePreview({ imageDataUrl, onExtractText, onCancel, isProcessing }: ImagePreviewProps) {
  const [crop, setCrop] = useState<Rect | null>(null);

  const handleExtract = async () => {
    onExtractText(crop ? await cropImage(imageDataUrl, crop) : imageDataUrl);
  };

  return (
    <Modal
      title="Select the seed words"
      size="max-w-6xl"
      onClose={() => !isProcessing && onCancel()}
      footer={
        <button type="button" onClick={handleExtract} disabled={isProcessing} className="btn btn-primary">
          {isProcessing ? (
            <span className="loading loading-spinner loading-sm" aria-hidden="true" />
          ) : (
            <MdTextSnippet aria-hidden="true" />
          )}
          {isProcessing ? 'Extracting' : crop ? 'Extract from selection' : 'Extract seed words'}
        </button>
      }
    >
      <p className="m-0 text-body text-ink-muted">
        Drag a box around the seed words for better results, or extract from the whole image.
      </p>
      <ImageZoomPan
        imageDataUrl={imageDataUrl}
        crop={crop}
        onCropChange={setCrop}
        disabled={isProcessing}
        viewportClassName="h-[55vh]"
      />
    </Modal>
  );
}
