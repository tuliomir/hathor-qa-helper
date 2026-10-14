/**
 * Large viewer for the OCR source image (zoom and pan, no selection).
 */

import ImageZoomPan, { type ImageHighlight, type Rect } from './ImageZoomPan';
import { Modal } from './ui/Modal';

interface OCRReferenceModalProps {
  imageDataUrl: string;
  onClose: () => void;
  highlights?: ImageHighlight[];
  focus?: Rect | null;
}

export default function OCRReferenceModal({ imageDataUrl, onClose, highlights, focus }: OCRReferenceModalProps) {
  return (
    <Modal title="OCR source image" size="max-w-6xl" onClose={onClose}>
      <ImageZoomPan imageDataUrl={imageDataUrl} highlights={highlights} focus={focus} viewportClassName="h-[65vh]" />
    </Modal>
  );
}
