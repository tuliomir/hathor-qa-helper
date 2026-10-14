/**
 * Tokenizer for MarkdownText: **bold**, *italic*, ++underline++,
 * ~~strikethrough~~, `code`, [links](url) and \n line breaks.
 */

export type TokenType = 'text' | 'code' | 'bold' | 'italic' | 'underline' | 'strikethrough' | 'link' | 'linebreak';

export interface Token {
  type: TokenType;
  content: string;
  url?: string; // For links
}

/**
 * Tokenize markdown text into an array of tokens
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];

  // Combined regex for all markdown patterns
  // Order matters: longer patterns first to avoid partial matches
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\+\+[^+]+\+\+)|(~~[^~]+~~)|(\[[^\]]+\]\([^)]+\))|(\n)/g;

  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add any text before this match
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    const matched = match[0];

    if (match[1]) {
      // Code: `text` (markers inside are not parsed)
      tokens.push({
        type: 'code',
        content: matched.slice(1, -1),
      });
    } else if (match[2]) {
      // Bold: **text**
      tokens.push({
        type: 'bold',
        content: matched.slice(2, -2),
      });
    } else if (match[3]) {
      // Italic: *text*
      tokens.push({
        type: 'italic',
        content: matched.slice(1, -1),
      });
    } else if (match[4]) {
      // Underline: ++text++
      tokens.push({
        type: 'underline',
        content: matched.slice(2, -2),
      });
    } else if (match[5]) {
      // Strikethrough: ~~text~~
      tokens.push({
        type: 'strikethrough',
        content: matched.slice(2, -2),
      });
    } else if (match[6]) {
      // Link: [text](url)
      const linkMatch = matched.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        tokens.push({
          type: 'link',
          content: linkMatch[1],
          url: linkMatch[2],
        });
      }
    } else if (match[7]) {
      // Line break: \n
      tokens.push({
        type: 'linebreak',
        content: '',
      });
    }

    lastIndex = pattern.lastIndex;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    tokens.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return tokens;
}
