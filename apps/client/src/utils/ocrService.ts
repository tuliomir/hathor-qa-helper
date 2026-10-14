/**
 * OCR Service for extracting seed words from images
 * Uses tesseract.js for text recognition with preprocessing
 */

import { createWorker, type Block, type Worker } from 'tesseract.js';
import { parseSeedWordsFromOcr, parseSeedWordsFromText, type OcrWord, type SeedWordBox } from './seedWords';

/**
 * Preprocesses an image to improve OCR accuracy
 * Applies contrast adjustment and binarization. Keeps the image size.
 */
export async function preprocessImage(imageDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Convert to grayscale and apply contrast enhancement
      for (let i = 0; i < data.length; i += 4) {
        // Grayscale conversion
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

        // Contrast enhancement (increase contrast)
        const contrast = 1.5;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const enhanced = factor * (gray - 128) + 128;

        // Binarization (Otsu's method approximation)
        const threshold = 128;
        const binary = enhanced > threshold ? 255 : 0;

        data[i] = binary;
        data[i + 1] = binary;
        data[i + 2] = binary;
      }

      // Put processed image back
      ctx.putImageData(imageData, 0, 0);

      // Convert to data URL
      resolve(canvas.toDataURL());
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for preprocessing'));
    };

    img.src = imageDataUrl;
  });
}

export interface OcrResult {
  text: string;
  /** Word tokens in reading order, with boxes in the recognized image's pixels. */
  words: OcrWord[];
}

/** Flattens tesseract's blocks → paragraphs → lines → words tree. */
function collectWords(blocks: Block[] | null): OcrWord[] {
  const words: OcrWord[] = [];
  for (const block of blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        for (const word of line.words) {
          const { x0, y0, x1, y1 } = word.bbox;
          words.push({ text: word.text, bbox: { x0, y0, x1, y1 } });
        }
      }
    }
  }
  return words;
}

/**
 * Runs OCR on an image. Preprocessing keeps the image size, so word boxes
 * are in the coordinates of `imageDataUrl`.
 */
export async function extractTextFromImage(imageDataUrl: string): Promise<OcrResult> {
  let worker: Worker | null = null;

  try {
    worker = await createWorker('eng', 1, { logger: () => {} });
    const processedImage = await preprocessImage(imageDataUrl);
    // tesseract.js v6 only returns the word tree when `blocks` is requested.
    const { data } = await worker.recognize(processedImage, {}, { text: true, blocks: true });
    return { text: data.text, words: collectWords(data.blocks) };
  } catch (error) {
    console.error('OCR error:', error);
    throw new Error('Failed to extract text from image');
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}

/**
 * Main OCR function to extract seed words from an image.
 * `words` lists each seed word with its box (null when OCR gave no word data).
 */
export async function extractSeedWordsFromImage(imageDataUrl: string): Promise<{
  success: boolean;
  seedWords: string;
  words: SeedWordBox[];
  error?: string;
}> {
  try {
    const { text, words: ocrWords } = await extractTextFromImage(imageDataUrl);
    const words = ocrWords.length > 0 ? parseSeedWordsFromOcr(ocrWords) : parseSeedWordsFromText(text);

    if (words.length < 12) {
      return {
        success: false,
        seedWords: '',
        words: [],
        error: 'Could not extract enough valid words. Please ensure the image is clear and contains seed words.',
      };
    }

    return { success: true, seedWords: words.map((w) => w.word).join(' '), words };
  } catch (error) {
    console.error('Error extracting seed words:', error);
    return {
      success: false,
      seedWords: '',
      words: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
