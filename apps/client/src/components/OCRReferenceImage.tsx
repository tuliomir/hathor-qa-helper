/**
 * Inline viewer for the image OCR read, with optional word highlights and
 * a focused word to zoom to. Expand opens OCRReferenceModal.
 */

import { MdClose, MdOpenInFull } from 'react-icons/md';
import ImageZoomPan, { type ImageHighlight, type Rect } from './ImageZoomPan';

interface OCRReferenceImageProps {
  imageDataUrl: string;
  onExpand: () => void;
  onDismiss: () => void;
  highlights?: ImageHighlight[];
  focus?: Rect | null;
  viewportClassName?: string;
}

export default function OCRReferenceImage({
  imageDataUrl,
  onExpand,
  onDismiss,
  highlights,
  focus,
  viewportClassName = 'h-72',
}: OCRReferenceImageProps) {
  return (
    <ImageZoomPan
      imageDataUrl={imageDataUrl}
      highlights={highlights}
      focus={focus}
      viewportClassName={viewportClassName}
      toolbarEnd={
        <>
          <button
            type="button"
            onClick={onExpand}
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Expand image"
          >
            <MdOpenInFull aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Dismiss OCR source image"
          >
            <MdClose aria-hidden="true" />
          </button>
        </>
      }
    />
  );
}
