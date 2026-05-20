// components/markdoun-editor/MarkdownPreview.tsx
'use client';

import { useTranslation } from '@/context/LanguageContext';

interface MarkdownPreviewProps {
  content: string;
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const { t } = useTranslation();
  if (!content) return <p className="text-gray-500 italic">{t('markdown_preview.no_content')}</p>;

  // Helper function to escape HTML
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

  const renderMarkdown = () => {
    const lines = content.split('\n');
    const result: JSX.Element[] = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      
      // Headers
      if (line.startsWith('# ')) {
        result.push(<h1 key={i} className="text-3xl font-bold mt-6 mb-4 text-gray-900 dark:text-white">{line.substring(2)}</h1>);
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        result.push(<h2 key={i} className="text-2xl font-bold mt-5 mb-3 text-gray-800 dark:text-gray-100">{line.substring(3)}</h2>);
        i++;
        continue;
      }
      if (line.startsWith('### ')) {
        result.push(<h3 key={i} className="text-xl font-bold mt-4 mb-2 text-gray-700 dark:text-gray-200">{line.substring(4)}</h3>);
        i++;
        continue;
      }
      if (line.startsWith('#### ')) {
        result.push(<h4 key={i} className="text-lg font-bold mt-3 mb-2 text-gray-600 dark:text-gray-300">{line.substring(5)}</h4>);
        i++;
        continue;
      }
      
      // Code block
      if (line.startsWith('```')) {
        const codeBlockEnd = content.indexOf('```', i + 1);
        if (codeBlockEnd !== -1) {
          const codeContent = lines.slice(i + 1, codeBlockEnd).join('\n');
          result.push(
            <pre key={i} className="bg-gray-900 text-gray-100 p-4 rounded-lg my-4 overflow-x-auto font-mono text-sm">
              <code>{codeContent}</code>
            </pre>
          );
          i = codeBlockEnd + 1;
          continue;
        }
      }
      
      // TABLES - Process tables with proper thead/tbody structure
      if (line.includes('|') && (i + 1 < lines.length && lines[i + 1].includes('---'))) {
        let headerRow: JSX.Element | null = null;
        let bodyRows: JSX.Element[] = [];
        let rowIndex = 0;
        let startI = i;
        
        while (i < lines.length && lines[i].includes('|')) {
          const cells = lines[i].split('|')
            .filter(cell => cell.trim() !== '')
            .map(cell => cell.trim());
          
          if (cells.length === 0) {
            i++;
            continue;
          }
          
          // Check if it's a separator row (contains ---)
          const isSeparator = cells.every(cell => cell.includes('-') || cell.includes(':'));
          
          if (!isSeparator) {
            if (rowIndex === 0) {
              // Header row
              headerRow = (
                <thead key={`thead-${startI}`}>
                  <tr>
                    {cells.map((cell, cellIdx) => (
                      <th key={cellIdx} className="border border-gray-300 dark:border-gray-700 px-4 py-2 font-semibold bg-gray-100 dark:bg-gray-800">
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
              );
            } else {
              // Body row
              bodyRows.push(
                <tr key={`tr-${i}`}>
                  {cells.map((cell, cellIdx) => (
                    <td key={cellIdx} className="border border-gray-300 dark:border-gray-700 px-4 py-2">
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
            <div key={`table-wrapper-${startI}`} className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse">
                {headerRow}
                {bodyRows.length > 0 && <tbody>{bodyRows}</tbody>}
              </table>
            </div>
          );
        }
        continue;
      }
      
      // Images - Process all images in the line
      const imageMatches = [...line.matchAll(/!\[(.*?)\]\((.*?)\)/g)];
      if (imageMatches.length > 0) {
        let lastIndex = 0;
        const elements: JSX.Element[] = [];
        
        imageMatches.forEach((match, idx) => {
          const fullMatch = match[0];
          const alt = match[1];
          const src = match[2];
          const matchIndex = line.indexOf(fullMatch, lastIndex);
          
          // Add text before image
          if (matchIndex > lastIndex) {
            const textPart = line.substring(lastIndex, matchIndex);
            if (textPart.trim()) {
              elements.push(
                <span key={`text-${i}-${idx}`} dangerouslySetInnerHTML={{ __html: textPart }} />
              );
            }
          }
          
          const isValidUrl = src && (src.startsWith('http') || src.startsWith('/uploads/'));
          
          elements.push(
            <div key={`img-${i}-${idx}`} className="my-4 text-center">
              {isValidUrl ? (
                <>
                  <img 
                    src={src}
                    alt={alt || 'Image'}
                    className="max-w-full h-auto rounded-lg shadow-md mx-auto"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const fallback = document.createElement('div');
                        fallback.className = 'bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center';
                        fallback.innerHTML = `
                          <svg class="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p class="text-sm text-gray-500">${escapeHtml(alt || t('markdown_preview.image_unavailable'))}</p>
                        `;
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                </>
              ) : (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-500">{escapeHtml(alt || t('markdown_preview.invalid_image_link'))}</p>
                  <code className="text-xs text-gray-400 break-all">{escapeHtml(src)}</code>
                </div>
              )}
            </div>
          );
          
          lastIndex = matchIndex + fullMatch.length;
        });
        
        // Add remaining text after last image
        if (lastIndex < line.length) {
          const textPart = line.substring(lastIndex);
          if (textPart.trim()) {
            elements.push(
              <span key={`text-${i}-end`} dangerouslySetInnerHTML={{ __html: textPart }} />
            );
          }
        }
        
        if (elements.length > 0) {
          result.push(<div key={i} className="my-2">{elements}</div>);
        }
        i++;
        continue;
      }
      
      // Links (for documents and regular links)
      const linkMatches = [...line.matchAll(/\[(.*?)\]\((.*?)\)/g)];
      if (linkMatches.length > 0 && !line.includes('![')) {
        let lastIndex = 0;
        const elements: JSX.Element[] = [];
        
        linkMatches.forEach((match, idx) => {
          const fullMatch = match[0];
          const text = match[1];
          const url = match[2];
          const matchIndex = line.indexOf(fullMatch, lastIndex);
          
          if (matchIndex > lastIndex) {
            const textPart = line.substring(lastIndex, matchIndex);
            if (textPart.trim()) {
              elements.push(
                <span key={`text-${i}-${idx}`} dangerouslySetInnerHTML={{ __html: textPart }} />
              );
            }
          }
          
          const fileExtension = url.split('.').pop()?.toLowerCase();
          const isDocument = ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'zip', 'rar', 'ppt', 'pptx'].includes(fileExtension || '');
          
          if (isDocument) {
            const fileIcons: Record<string, string> = {
              pdf: '📄',
              doc: '📝',
              docx: '📝',
              txt: '📃',
              xls: '📊',
              xlsx: '📊',
              zip: '📦',
              rar: '📦',
              ppt: '📽️',
              pptx: '📽️',
            };
            const icon = fileIcons[fileExtension || ''] || '📎';
            
            elements.push(
              <a 
                key={`link-${i}-${idx}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors my-1 mx-1"
              >
                <span className="text-lg">{icon}</span>
                <span className="text-blue-600 dark:text-blue-400 hover:underline">{text}</span>
                <span className="text-xs text-gray-500">({fileExtension?.toUpperCase() || t('markdown_preview.file_label').toUpperCase()})</span>
              </a>
            );
          } else {
            elements.push(
              <a 
                key={`link-${i}-${idx}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline mx-1"
              >
                {text}
              </a>
            );
          }
          
          lastIndex = matchIndex + fullMatch.length;
        });
        
        if (lastIndex < line.length) {
          const textPart = line.substring(lastIndex);
          if (textPart.trim()) {
            elements.push(
              <span key={`text-${i}-end`} dangerouslySetInnerHTML={{ __html: textPart }} />
            );
          }
        }
        
        if (elements.length > 0) {
          result.push(<p key={i} className="my-3 leading-relaxed">{elements}</p>);
        }
        i++;
        continue;
      }
      
      // Blockquote
      if (line.startsWith('> ')) {
        result.push(<blockquote key={i} className="border-l-4 border-blue-500 pl-4 py-2 my-3 text-gray-600 dark:text-gray-300 italic">{line.substring(2)}</blockquote>);
        i++;
        continue;
      }
      
      // List items - unordered
      if (line.startsWith('- ') || line.startsWith('* ')) {
        result.push(<li key={i} className="ml-6 my-1 list-disc">{line.substring(2)}</li>);
        i++;
        continue;
      }
      
      // List items - ordered
      if (/^\d+\.\s/.test(line)) {
        result.push(<li key={i} className="ml-6 my-1 list-decimal">{line.replace(/^\d+\.\s/, '')}</li>);
        i++;
        continue;
      }
      
      // Checkbox
      if (line.startsWith('- [ ] ')) {
        result.push(<li key={i} className="ml-6 my-1 list-none"><input type="checkbox" className="mr-2" disabled /> {line.substring(6)}</li>);
        i++;
        continue;
      }
      if (line.startsWith('- [x] ')) {
        result.push(<li key={i} className="ml-6 my-1 list-none"><input type="checkbox" className="mr-2" checked disabled /> {line.substring(6)}</li>);
        i++;
        continue;
      }
      
      // Horizontal rule
      if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
        result.push(<hr key={i} className="my-6 border-gray-300 dark:border-gray-700" />);
        i++;
        continue;
      }
      
      // Process inline formatting for paragraphs
      let processedLine = line;
      
      // Bold
      processedLine = processedLine.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
      processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      processedLine = processedLine.replace(/__(.*?)__/g, '<strong>$1</strong>');
      
      // Italic
      processedLine = processedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
      processedLine = processedLine.replace(/_(.*?)_/g, '<em>$1</em>');
      
      // Inline code
      processedLine = processedLine.replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
      
      // Paragraph
      if (processedLine.trim()) {
        result.push(<p key={i} className="my-3 leading-relaxed text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: processedLine }} />);
      } else if (i > 0 && lines[i-1].trim() === '') {
        // Skip multiple empty lines
      } else {
        result.push(<br key={i} />);
      }
      
      i++;
    }
    
    return result;
  };

  return (
    <div className="prose dark:prose-invert max-w-none">
      {renderMarkdown()}
    </div>
  );
}