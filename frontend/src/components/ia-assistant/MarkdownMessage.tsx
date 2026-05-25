'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownMessageProps {
  content: string;
  /** true for user bubbles (white text on green), false for assistant bubbles */
  isUser?: boolean;
}

export default function MarkdownMessage({ content, isUser = false }: MarkdownMessageProps) {
  const components: Components = {
    // ── Paragraphs ────────────────────────────────────────────────────────
    p({ children }) {
      return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
    },

    // ── Headings ──────────────────────────────────────────────────────────
    h1({ children }) {
      return <h1 className={`text-base font-bold mb-2 mt-3 first:mt-0 ${isUser ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{children}</h1>;
    },
    h2({ children }) {
      return <h2 className={`text-sm font-bold mb-1.5 mt-3 first:mt-0 ${isUser ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{children}</h2>;
    },
    h3({ children }) {
      return <h3 className={`text-sm font-semibold mb-1 mt-2 first:mt-0 ${isUser ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>{children}</h3>;
    },

    // ── Bold / Italic ──────────────────────────────────────────────────────
    strong({ children }) {
      return <strong className="font-semibold">{children}</strong>;
    },
    em({ children }) {
      return <em className="italic">{children}</em>;
    },

    // ── Lists ──────────────────────────────────────────────────────────────
    ul({ children }) {
      return <ul className="my-1.5 pl-4 space-y-0.5 list-disc">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="my-1.5 pl-4 space-y-0.5 list-decimal">{children}</ol>;
    },
    li({ children }) {
      return <li className="leading-relaxed">{children}</li>;
    },

    // ── Inline code ────────────────────────────────────────────────────────
    code({ children, className }) {
      const isBlock = className?.startsWith('language-');
      if (isBlock) {
        // Handled by <pre>
        return <code className={className}>{children}</code>;
      }
      return (
        <code className={`px-1 py-0.5 rounded text-[0.8em] font-mono ${
          isUser
            ? 'bg-white/20 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-[#0F6B54] dark:text-emerald-400'
        }`}>
          {children}
        </code>
      );
    },

    // ── Code blocks ────────────────────────────────────────────────────────
    pre({ children }) {
      return (
        <pre className={`my-2 p-3 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed ${
          isUser
            ? 'bg-white/15 text-white'
            : 'bg-gray-900 dark:bg-gray-950 text-gray-100'
        }`}>
          {children}
        </pre>
      );
    },

    // ── Blockquote ─────────────────────────────────────────────────────────
    blockquote({ children }) {
      return (
        <blockquote className={`my-2 pl-3 border-l-2 italic ${
          isUser
            ? 'border-white/50 text-white/80'
            : 'border-[#168F6F] text-gray-600 dark:text-gray-400'
        }`}>
          {children}
        </blockquote>
      );
    },

    // ── Horizontal rule ────────────────────────────────────────────────────
    hr() {
      return <hr className={`my-3 ${isUser ? 'border-white/30' : 'border-gray-200 dark:border-gray-700'}`} />;
    },

    // ── Links ──────────────────────────────────────────────────────────────
    a({ href, children }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline underline-offset-2 ${
            isUser
              ? 'text-white/90 hover:text-white'
              : 'text-[#168F6F] hover:text-[#0F6B54]'
          }`}
        >
          {children}
        </a>
      );
    },

    // ── Tables (GFM) ───────────────────────────────────────────────────────
    table({ children }) {
      return (
        <div className="my-2 overflow-x-auto">
          <table className={`text-xs border-collapse w-full ${isUser ? 'text-white' : ''}`}>
            {children}
          </table>
        </div>
      );
    },
    thead({ children }) {
      return <thead className={isUser ? 'border-b border-white/30' : 'border-b border-gray-300 dark:border-gray-600'}>{children}</thead>;
    },
    th({ children }) {
      return <th className="px-2 py-1 text-left font-semibold">{children}</th>;
    },
    td({ children }) {
      return <td className={`px-2 py-1 border-t ${isUser ? 'border-white/20' : 'border-gray-200 dark:border-gray-700'}`}>{children}</td>;
    },
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
