'use client';

import { getToken } from '../../../services/auth.service';
import { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, AlertCircle, BookOpen, ExternalLink } from 'lucide-react';
import MarkdownMessage from './MarkdownMessage';
import Link from 'next/link';
import { useTranslation } from '../../context/LanguageContext';
import { translateError } from '@/utils/errorTranslation';

interface RagSource {
  publicationId: number;
  title: string;
  chunkIndex: number;
  similarity: number;
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  error?: boolean;
  sources?: RagSource[];
}

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_BASE_URL = 'http://localhost:3000';

const initialMessages: Message[] = [
  {
    id: '1',
    content: 'Bonjour ! Je suis votre assistant IA. Posez-moi une question sur les publications disponibles.',
    role: 'assistant',
    timestamp: new Date(),
  },
];

export default function AIAssistant({ isOpen, onClose }: AIAssistantProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: trimmed,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ q: trimmed }),
      });

      if (!response.ok) {
        let errorMessage = `Erreur serveur (${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData?.message) errorMessage = errorData.message;
        } catch { /* non-JSON */ }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          content: data.answer ?? 'Aucune réponse disponible.',
          role: 'assistant',
          timestamp: new Date(),
          sources: data.sources?.length ? data.sources : undefined,
        },
      ]);
    } catch (error: unknown) {
      const message = translateError(
        error instanceof Error ? error.message : undefined,
        t,
      );
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          content: message,
          role: 'assistant',
          timestamp: new Date(),
          error: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Chat bubble — large, fixed bottom-right */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-slideUp"
        style={{ width: '380px', height: '620px' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#168F6F] to-[#0F6B54] text-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-none">Assistant IA</h3>
              <p className="text-[11px] opacity-75 mt-0.5">Explorez vos publications par l'IA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 bg-gray-50 dark:bg-gray-950 custom-scrollbar">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 animate-messageSlide ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                message.role === 'assistant'
                  ? message.error ? 'bg-red-500 text-white' : 'bg-[#168F6F] text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>
                {message.role === 'assistant'
                  ? message.error ? <AlertCircle className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />
                  : <User className="h-3.5 w-3.5" />}
              </div>

              {/* Bubble + sources */}
              <div
                className={`flex flex-col gap-1.5 min-w-0 ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                style={{ maxWidth: 'calc(100% - 36px)' }}
              >
                <div className={`px-3 py-2.5 text-sm break-words w-full ${
                  message.role === 'assistant'
                    ? message.error
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-2xl rounded-tl-none'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl rounded-tl-none shadow-sm'
                    : 'bg-[#168F6F] text-white rounded-2xl rounded-tr-none'
                }`}>
                  {message.error
                    ? message.content
                    : <MarkdownMessage content={message.content} isUser={message.role === 'user'} />
                  }
                </div>

                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="w-full flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1 pl-0.5">
                      <BookOpen className="h-3 w-3" />
                      Sources
                    </span>
                    {message.sources.map((source) => (
                      <Link
                        key={`${source.publicationId}-${source.chunkIndex}`}
                        href={`/home?publication=${source.publicationId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-2.5 py-1.5 text-xs hover:border-[#168F6F]/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all group"
                      >
                        <span className="text-gray-700 dark:text-gray-300 truncate font-medium group-hover:text-[#168F6F] transition-colors">
                          {source.title}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-[#168F6F] font-bold tabular-nums">
                            {Math.round(source.similarity * 100)}%
                          </span>
                          <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-[#168F6F] transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-2 animate-fadeIn">
              <div className="h-7 w-7 rounded-full bg-[#168F6F] text-white flex items-center justify-center flex-shrink-0">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none px-3 py-2.5 shadow-sm">
                <div className="flex gap-1 items-center h-4">
                  <span className="h-1.5 w-1.5 bg-[#168F6F] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 bg-[#168F6F] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 bg-[#168F6F] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input ── */}
        <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question..."
              disabled={isTyping}
              className="flex-1 px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#168F6F] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="px-3 py-2.5 bg-[#168F6F] text-white rounded-xl hover:bg-[#0F6B54] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="Envoyer"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes messageSlide {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn       { animation: fadeIn 0.25s ease-out; }
        .animate-slideUp      { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-messageSlide { animation: messageSlide 0.2s ease-out; }

        .custom-scrollbar::-webkit-scrollbar       { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb       { background: #374151; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4b5563; }
      `}</style>
    </>
  );
}
