/**
 * Simple Markdown Text Renderer
 * Supports: **bold**, *italic*, ++underline++, ~~strikethrough~~, [links](url), and \n line breaks
 */

import React from 'react';

interface MarkdownTextProps {
  children: string;
  className?: string;
}

type TokenType = 'text' | 'bold' | 'italic' | 'underline' | 'strikethrough' | 'link' | 'linebreak';

interface Token {
  type: TokenType;
  content: string;
  url?: string; // For links
}

/**
 * Tokenize markdown text into an array of tokens
 */
function tokenize(text: string): Token[] {
  const tokens: Token[] = [];

  // Combined regex for all markdown patterns
  // Order matters: longer patterns first to avoid partial matches
  const pattern =
    /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\+\+[^+]+\+\+)|(~~[^~]+~~)|(\[[^\]]+\]\([^)]+\))|(\n)/g;

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
      // Bold: **text**
      tokens.push({
        type: 'bold',
        content: matched.slice(2, -2),
      });
    } else if (match[2]) {
      // Italic: *text*
      tokens.push({
        type: 'italic',
        content: matched.slice(1, -1),
      });
    } else if (match[3]) {
      // Underline: ++text++
      tokens.push({
        type: 'underline',
        content: matched.slice(2, -2),
      });
    } else if (match[4]) {
      // Strikethrough: ~~text~~
      tokens.push({
        type: 'strikethrough',
        content: matched.slice(2, -2),
      });
    } else if (match[5]) {
      // Link: [text](url)
      const linkMatch = matched.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        tokens.push({
          type: 'link',
          content: linkMatch[1],
          url: linkMatch[2],
        });
      }
    } else if (match[6]) {
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

/**
 * Render a single token to React elements
 */
function renderToken(token: Token, index: number): React.ReactNode {
  switch (token.type) {
    case 'bold':
      return (
        <strong key={index} className="font-bold">
          {token.content}
        </strong>
      );
    case 'italic':
      return (
        <em key={index} className="italic">
          {token.content}
        </em>
      );
    case 'underline':
      return (
        <span key={index} className="underline">
          {token.content}
        </span>
      );
    case 'strikethrough':
      return (
        <span key={index} className="line-through">
          {token.content}
        </span>
      );
    case 'link':
      return (
        <a
          key={index}
          href={token.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          {token.content}
        </a>
      );
    case 'linebreak':
      return <br key={index} />;
    case 'text':
    default:
      return token.content;
  }
}

/**
 * MarkdownText Component
 * Renders simple markdown formatting in text
 *
 * Supported syntax:
 * - **bold** - Bold text
 * - *italic* - Italic text
 * - ++underline++ - Underlined text
 * - ~~strikethrough~~ - Strikethrough text
 * - [link text](url) - Hyperlinks
 * - \n - Line breaks
 */
export default function MarkdownText({ children, className }: MarkdownTextProps) {
  const tokens = tokenize(children);

  return <span className={className}>{tokens.map((token, index) => renderToken(token, index))}</span>;
}
