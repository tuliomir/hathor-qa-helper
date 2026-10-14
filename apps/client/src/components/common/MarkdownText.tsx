/**
 * Simple Markdown Text Renderer
 * Supports: **bold**, *italic*, ++underline++, ~~strikethrough~~, `code`, [links](url), and \n line breaks
 */

import React from 'react';
import { tokenize, type Token } from '../../utils/markdownTokens';

interface MarkdownTextProps {
  children: string;
  className?: string;
}

/**
 * Render a single token to React elements
 */
function renderToken(token: Token, index: number): React.ReactNode {
  switch (token.type) {
    case 'code':
      return (
        <code key={index} className="rounded-selector bg-base-200 px-1 font-mono text-data">
          {token.content}
        </code>
      );
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
        <a key={index} href={token.url} target="_blank" rel="noopener noreferrer" className="link link-primary">
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
 * - `code` - Inline code
 * - [link text](url) - Hyperlinks
 * - \n - Line breaks
 */
export default function MarkdownText({ children, className }: MarkdownTextProps) {
  const tokens = tokenize(children);

  return <span className={className}>{tokens.map((token, index) => renderToken(token, index))}</span>;
}
