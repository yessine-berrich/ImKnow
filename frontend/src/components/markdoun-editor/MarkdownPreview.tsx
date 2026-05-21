// components/markdoun-editor/MarkdownPreview.tsx
'use client';

import { useTranslation } from '@/context/LanguageContext';

interface MarkdownPreviewProps {
  content: string;
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const { t } = useTranslation();
  if (!content) return <p className="text-gray-500 dark:text-gray-400 italic">{t('markdown_preview.no_content')}</p>;

  const escapeHtml = (text: string): string => {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
  };

  // blob: URLs are valid during preview (before upload), http/https and /uploads/ are valid after upload
  const isValidImageSrc = (src: string) =>
    src && (src.startsWith('blob:') || src.startsWith('http') || src.startsWith('/uploads/') || src.startsWith('/'));

  const renderMarkdown = () => {
    const lines = content.split('\n');
    const result: JSX.Element[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // ── Headers ──────────────────────────────────────────────────────────────
      if (line.startsWith('#### ')) {
        result.push(<h4 key={i} className="text-lg font-bold mt-3 mb-2 text-gray-700 dark:text-gray-200">{line.substring(5)}</h4>);
        i++; continue;
      }
      if (line.startsWith('### ')) {
        result.push(<h3 key={i} className="text-xl font-bold mt-4 mb-2 text-gray-800 dark:text-gray-100">{line.substring(4)}</h3>);
        i++; continue;
      }
      if (line.startsWith('## ')) {
        result.push(<h2 key={i} className="text-2xl font-bold mt-5 mb-3 text-gray-900 dark:text-white">{line.substring(3)}</h2>);
        i++; continue;
      }
      if (line.startsWith('# ')) {
        result.push(<h1 key={i} className="text-3xl font-bold mt-6 mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">{line.substring(2)}</h1>);
        i++; continue;
      }

      // ── Code block ───────────────────────────────────────────────────────────
      if (line.startsWith('```')) {
        const lang = line.substring(3).trim();
        let j = i + 1;
        while (j < lines.length && !lines[j].startsWith('```')) j++;
        const codeContent = lines.slice(i + 1, j).join('\n');
        result.push(
          <div key={i} className="my-4">
            {lang && (
              <div className="flex items-center gap-2 bg-gray-700 dark:bg-gray-900 px-4 py-1.5 rounded-t-lg text-xs text-gray-300">
                <span>{lang}</span>
              </div>
            )}
            <pre className={`bg-gray-800 dark:bg-gray-900 text-gray-100 px-4 py-3 ${lang ? 'rounded-b-lg' : 'rounded-lg'} overflow-x-auto font-mono text-sm`}>
              <code>{codeContent}</code>
            </pre>
          </div>
        );
        i = j + 1;
        continue;
      }

      // ── Tables ───────────────────────────────────────────────────────────────
      if (line.includes('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
        const startI = i;
        let headerRow: JSX.Element | null = null;
        const bodyRows: JSX.Element[] = [];
        let rowIndex = 0;

        while (i < lines.length && lines[i].includes('|')) {
          const cells = lines[i].split('|').filter(c => c.trim() !== '').map(c => c.trim());
          if (cells.length === 0) { i++; continue; }
          const isSeparator = cells.every(c => /^[-:]+$/.test(c.trim()));
          if (!isSeparator) {
            if (rowIndex === 0) {
              headerRow = (
                <thead key={`thead-${startI}`}>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    {cells.map((cell, ci) => (
                      <th key={ci} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold text-gray-800 dark:text-gray-100">
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
              );
            } else {
              bodyRows.push(
                <tr key={`tr-${i}`} className="even:bg-gray-50 dark:even:bg-gray-800/50">
                  {cells.map((cell, ci) => (
                    <td key={ci} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-700 dark:text-gray-300">
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            }
            rowIndex++;
          }
          i++;
        }

        if (headerRow || bodyRows.length > 0) {
          result.push(
            <div key={`table-${startI}`} className="overflow-x-auto my-4 rounded-lg border border-gray-300 dark:border-gray-600">
              <table className="min-w-full border-collapse">
                {headerRow}
                {bodyRows.length > 0 && <tbody>{bodyRows}</tbody>}
              </table>
            </div>
          );
        }
        continue;
      }

      // ── Images ───────────────────────────────────────────────────────────────
      const imageMatches = [...line.matchAll(/!\[(.*?)\]\((.*?)\)/g)];
      if (imageMatches.length > 0) {
        let lastIndex = 0;
        const elements: JSX.Element[] = [];

        imageMatches.forEach((match, idx) => {
          const alt = match[1];
          const src = match[2];
          const matchIndex = line.indexOf(match[0], lastIndex);

          if (matchIndex > lastIndex) {
            const textPart = line.substring(lastIndex, matchIndex);
            if (textPart.trim()) elements.push(<span key={`t-${i}-${idx}`} className="text-gray-700 dark:text-gray-300">{textPart}</span>);
          }

          elements.push(
            <figure key={`img-${i}-${idx}`} className="my-4 text-center">
              {isValidImageSrc(src) ? (
                <img
                  src={src}
                  alt={alt || 'Image'}
                  className="max-w-full h-auto rounded-lg shadow-md mx-auto border border-gray-200 dark:border-gray-700"
                  loading="lazy"
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.style.display = 'none';
                    const parent = img.parentElement;
                    if (parent && !parent.querySelector('.img-error')) {
                      const fallback = document.createElement('div');
                      fallback.className = 'img-error bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center border border-dashed border-gray-300 dark:border-gray-600';
                      fallback.innerHTML = `
                        <svg class="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p class="text-sm text-gray-500 dark:text-gray-400">${escapeHtml(alt || t('markdown_preview.image_unavailable'))}</p>
                      `;
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center border border-dashed border-gray-300 dark:border-gray-600">
                  <svg className="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{alt || t('markdown_preview.invalid_image_link')}</p>
                  <code className="text-xs text-gray-400 dark:text-gray-500 break-all mt-1 block">{src}</code>
                </div>
              )}
            </figure>
          );

          lastIndex = matchIndex + match[0].length;
        });

        if (lastIndex < line.length) {
          const textPart = line.substring(lastIndex);
          if (textPart.trim()) elements.push(<span key={`t-${i}-end`} className="text-gray-700 dark:text-gray-300">{textPart}</span>);
        }

        if (elements.length > 0) result.push(<div key={i}>{elements}</div>);
        i++; continue;
      }

      // ── Links ────────────────────────────────────────────────────────────────
      const linkMatches = [...line.matchAll(/\[(.*?)\]\((.*?)\)/g)];
      if (linkMatches.length > 0 && !line.includes('![')) {
        let lastIndex = 0;
        const elements: JSX.Element[] = [];

        linkMatches.forEach((match, idx) => {
          const text = match[1];
          const url = match[2];
          const matchIndex = line.indexOf(match[0], lastIndex);

          if (matchIndex > lastIndex) {
            const textPart = line.substring(lastIndex, matchIndex);
            if (textPart.trim()) elements.push(<span key={`t-${i}-${idx}`} className="text-gray-700 dark:text-gray-300">{textPart}</span>);
          }

          const ext = url.split('.').pop()?.toLowerCase() ?? '';
          const docExts = ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'zip', 'rar', 'ppt', 'pptx'];
          const docIcons: Record<string, string> = { pdf: '📄', doc: '📝', docx: '📝', txt: '📃', xls: '📊', xlsx: '📊', zip: '📦', rar: '📦', ppt: '📽️', pptx: '📽️' };

          if (docExts.includes(ext)) {
            elements.push(
              <a key={`a-${i}-${idx}`} href={url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors my-1 mx-1 border border-gray-200 dark:border-gray-600">
                <span>{docIcons[ext] || '📎'}</span>
                <span className="text-blue-600 dark:text-blue-400 hover:underline text-sm">{text}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">({ext.toUpperCase()})</span>
              </a>
            );
          } else {
            elements.push(
              <a key={`a-${i}-${idx}`} href={url} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-800 dark:hover:text-blue-300 transition-colors mx-0.5">
                {text}
              </a>
            );
          }

          lastIndex = matchIndex + match[0].length;
        });

        if (lastIndex < line.length) {
          const textPart = line.substring(lastIndex);
          if (textPart.trim()) elements.push(<span key={`t-${i}-end`} className="text-gray-700 dark:text-gray-300">{textPart}</span>);
        }

        if (elements.length > 0) result.push(<p key={i} className="my-3 leading-relaxed">{elements}</p>);
        i++; continue;
      }

      // ── Blockquote ───────────────────────────────────────────────────────────
      if (line.startsWith('> ')) {
        result.push(
          <blockquote key={i} className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-1 my-3 bg-blue-50 dark:bg-blue-900/20 rounded-r-md">
            <p className="text-gray-600 dark:text-gray-300 italic">{line.substring(2)}</p>
          </blockquote>
        );
        i++; continue;
      }

      // ── Checkboxes ───────────────────────────────────────────────────────────
      if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
        result.push(
          <li key={i} className="ml-6 my-1 list-none flex items-start gap-2 text-gray-700 dark:text-gray-300">
            <input type="checkbox" className="mt-1 accent-blue-600" checked readOnly />
            <span className="line-through text-gray-500 dark:text-gray-400">{line.substring(6)}</span>
          </li>
        );
        i++; continue;
      }
      if (line.startsWith('- [ ] ')) {
        result.push(
          <li key={i} className="ml-6 my-1 list-none flex items-start gap-2 text-gray-700 dark:text-gray-300">
            <input type="checkbox" className="mt-1 accent-blue-600" readOnly />
            <span>{line.substring(6)}</span>
          </li>
        );
        i++; continue;
      }

      // ── Unordered list ───────────────────────────────────────────────────────
      if (line.startsWith('- ') || line.startsWith('* ')) {
        result.push(<li key={i} className="ml-6 my-1 list-disc text-gray-700 dark:text-gray-300">{line.substring(2)}</li>);
        i++; continue;
      }

      // ── Ordered list ─────────────────────────────────────────────────────────
      if (/^\d+\.\s/.test(line)) {
        result.push(<li key={i} className="ml-6 my-1 list-decimal text-gray-700 dark:text-gray-300">{line.replace(/^\d+\.\s/, '')}</li>);
        i++; continue;
      }

      // ── Horizontal rule ──────────────────────────────────────────────────────
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
        result.push(<hr key={i} className="my-6 border-gray-300 dark:border-gray-600" />);
        i++; continue;
      }

      // ── Paragraph (with inline formatting) ───────────────────────────────────
      let processedLine = escapeHtml(line);
      processedLine = processedLine.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
      processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      processedLine = processedLine.replace(/__(.*?)__/g, '<strong>$1</strong>');
      processedLine = processedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
      processedLine = processedLine.replace(/_(.*?)_/g, '<em>$1</em>');
      processedLine = processedLine.replace(/`(.*?)`/g,
        '<code class="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-200 dark:border-gray-600">$1</code>');

      if (processedLine.trim()) {
        result.push(<p key={i} className="my-3 leading-relaxed text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: processedLine }} />);
      } else if (i > 0 && lines[i - 1].trim()) {
        result.push(<br key={i} />);
      }

      i++;
    }

    return result;
  };

  return (
    <div className="max-w-none text-gray-800 dark:text-gray-200 leading-relaxed">
      {renderMarkdown()}
    </div>
  );
}
