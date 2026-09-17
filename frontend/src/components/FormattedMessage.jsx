import React from 'react';

/**
 * Parses inline markdown tokens:
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - `code`
 * - [text](url)
 */
export function renderInlineMarkdown(text) {
  if (!text || typeof text !== 'string') return text;

  // Split by inline patterns: code, bold, italic, links
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;

    // Inline code: `token`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const codeContent = part.slice(1, -1);
      return (
        <code key={i} className="formatted-inline-code font-mono">
          {codeContent}
        </code>
      );
    }

    // Bold: **text** or __text__
    if ((part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
        (part.startsWith('__') && part.endsWith('__') && part.length >= 4)) {
      const boldContent = part.slice(2, -2);
      return (
        <strong key={i} className="formatted-bold font-semibold">
          {boldContent}
        </strong>
      );
    }

    // Italic: *text* or _text_
    if ((part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
        (part.startsWith('_') && part.endsWith('_') && part.length >= 2)) {
      const italicContent = part.slice(1, -1);
      return (
        <em key={i} className="formatted-italic">
          {italicContent}
        </em>
      );
    }

    // Markdown Link: [label](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="formatted-link"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return part;
  });
}

/**
 * Parses multi-line markdown content into structured React blocks:
 * Headings (H1-H4), Lists (UL/OL), Code Blocks, Blockquotes, Tables, and Paragraphs.
 */
export default function FormattedMessage({ content }) {
  if (!content || typeof content !== 'string') {
    return <p className="formatted-paragraph">{(content || '').toString()}</p>;
  }

  // Pre-process lines
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let currentList = null; // { type: 'ul' | 'ol', items: [] }
  let currentCodeBlock = null; // { lang: '', lines: [] }
  let currentTable = null; // { headers: [], rows: [] }

  const flushList = () => {
    if (currentList) {
      blocks.push({ ...currentList });
      currentList = null;
    }
  };

  const flushCodeBlock = () => {
    if (currentCodeBlock) {
      blocks.push({ type: 'codeblock', ...currentCodeBlock });
      currentCodeBlock = null;
    }
  };

  const flushTable = () => {
    if (currentTable) {
      blocks.push({ type: 'table', ...currentTable });
      currentTable = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code block delimiter ```
    if (trimmed.startsWith('```')) {
      if (currentCodeBlock) {
        flushCodeBlock();
      } else {
        flushList();
        flushTable();
        const lang = trimmed.slice(3).trim();
        currentCodeBlock = { lang, lines: [] };
      }
      continue;
    }

    if (currentCodeBlock) {
      currentCodeBlock.lines.push(line);
      continue;
    }

    // 2. Table row detection (| col1 | col2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
      flushList();
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());

      // Check if separator line (| --- | --- |)
      const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));

      if (isSeparator) {
        // Ignored as header separator
        continue;
      }

      if (!currentTable) {
        currentTable = { headers: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    } else {
      flushTable();
    }

    // Empty line -> flush open lists/tables, creates section spacing
    if (!trimmed) {
      flushList();
      continue;
    }

    // 3. Headings (#, ##, ###, ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      blocks.push({ type: 'heading', level, text });
      continue;
    }

    // 4. Blockquotes (> ...)
    if (trimmed.startsWith('>')) {
      flushList();
      const quoteText = trimmed.replace(/^>\s?/, '');
      blocks.push({ type: 'blockquote', text: quoteText });
      continue;
    }

    // 5. Unordered List item (- item or * item)
    const ulMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(ulMatch[1]);
      continue;
    }

    // 6. Ordered List item (1. item)
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(olMatch[2]);
      continue;
    }

    // 7. Regular paragraph line
    flushList();
    blocks.push({ type: 'paragraph', text: trimmed });
  }

  flushList();
  flushCodeBlock();
  flushTable();

  return (
    <div className="formatted-markdown-root font-sans">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            const Tag = `h${block.level === 1 ? 3 : block.level === 2 ? 3 : block.level === 3 ? 4 : 5}`;
            return (
              <div key={idx} className={`formatted-heading-wrap formatted-h${block.level}`}>
                <Tag className="formatted-heading font-semibold">
                  {renderInlineMarkdown(block.text)}
                </Tag>
              </div>
            );
          }

          case 'paragraph':
            return (
              <p key={idx} className="formatted-paragraph">
                {renderInlineMarkdown(block.text)}
              </p>
            );

          case 'ul':
            return (
              <ul key={idx} className="formatted-ul">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="formatted-li">
                    <span className="formatted-bullet-dot" />
                    <span className="formatted-li-content">{renderInlineMarkdown(item)}</span>
                  </li>
                ))}
              </ul>
            );

          case 'ol':
            return (
              <ol key={idx} className="formatted-ol">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="formatted-ol-item">
                    <span className="formatted-ol-number font-mono">{itemIdx + 1}</span>
                    <span className="formatted-li-content">{renderInlineMarkdown(item)}</span>
                  </li>
                ))}
              </ol>
            );

          case 'blockquote':
            return (
              <blockquote key={idx} className="formatted-blockquote">
                {renderInlineMarkdown(block.text)}
              </blockquote>
            );

          case 'codeblock':
            return (
              <div key={idx} className="formatted-codeblock-wrapper font-mono">
                {block.lang && (
                  <div className="formatted-codeblock-header">
                    <span className="codeblock-lang font-mono">{block.lang}</span>
                  </div>
                )}
                <pre className="formatted-codeblock-pre">
                  <code>{block.lines.join('\n')}</code>
                </pre>
              </div>
            );

          case 'table':
            return (
              <div key={idx} className="formatted-table-container">
                <table className="formatted-table font-sans">
                  <thead>
                    <tr>
                      {block.headers.map((th, thIdx) => (
                        <th key={thIdx}>{renderInlineMarkdown(th)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx}>{renderInlineMarkdown(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
