/**
 * OCR Service for extracting seed words from images
 * Uses tesseract.js for text recognition with preprocessing
 */

import { createWorker, type Worker } from 'tesseract.js';

/**
 * Preprocesses an image to improve OCR accuracy
 * Applies contrast adjustment and binarization
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

/**
 * Extracts text from an image using OCR
 */
export async function extractTextFromImage(imageDataUrl: string): Promise<string> {
  let worker: Worker | null = null;

  try {
    // Create and initialize tesseract worker
    worker = await createWorker('eng', 1, {
      // Performance optimization - use less logging
      logger: () => {}, // Disable logging for better performance
    });

    // Preprocess the image for better accuracy
    const processedImage = await preprocessImage(imageDataUrl);

    // Recognize text
    const { data: { text } } = await worker.recognize(processedImage);

    return text;
  } catch (error) {
    console.error('OCR error:', error);
    throw new Error('Failed to extract text from image');
  } finally {
    // Clean up worker
    if (worker) {
      await worker.terminate();
    }
  }
}

/**
 * Parses seed words from OCR text
 * Handles various formats:
 * - Numbered lists (1. word, 2. word)
 * - Simple word lists
 * - Multi-column layouts
 */
export function parseSeedWords(ocrText: string): string {
  // Split by lines and clean up
  const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  const words: string[] = [];

  for (const line of lines) {
    // Remove common OCR artifacts and numbers
    let cleanedLine = line
      .replace(/^\d+[\s.)\-:]+/g, '') // Remove leading numbers with separators (1. word, 1) word, 1- word)
      .replace(/[^\w\s]/g, ' ') // Remove special characters except word chars and spaces
      .trim()
      .toLowerCase();

    // Split by whitespace and collect valid words
    const lineWords = cleanedLine.split(/\s+/).filter(word => {
      // Filter out empty strings and common OCR artifacts
      return word.length > 2 && word.length < 15 && /^[a-z]+$/.test(word);
    });

    words.push(...lineWords);
  }

  // Return the first 24 words (standard seed phrase length)
  return words.slice(0, 24).join(' ');
}

/**
 * Main OCR function to extract seed words from a clipboard image
 */
export async function extractSeedWordsFromImage(imageDataUrl: string): Promise<{
  success: boolean;
  seedWords: string;
  error?: string;
}> {
  try {
    // Extract text using OCR
    const rawText = await extractTextFromImage(imageDataUrl);

    // Parse seed words from the extracted text
    const seedWords = parseSeedWords(rawText);

    if (!seedWords || seedWords.split(' ').length < 12) {
      return {
        success: false,
        seedWords: '',
        error: 'Could not extract enough valid words. Please ensure the image is clear and contains seed words.',
      };
    }

    return {
      success: true,
      seedWords,
    };
  } catch (error) {
    console.error('Error extracting seed words:', error);
    return {
      success: false,
      seedWords: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
