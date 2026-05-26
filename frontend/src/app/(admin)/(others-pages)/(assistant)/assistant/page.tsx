'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Bot, User, AlertCircle, BookOpen, ExternalLink, Sparkles,
  Plus, Trash2, Pin, PinOff, Pencil, Check, X,
  MessageSquare, ChevronLeft, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { getToken } from '../../../../../../services/auth.service';
import MarkdownMessage from '../../../../../components/ia-assistant/MarkdownMessage';
import {
  aiConversationService,
  AiConversation,
  AiMessage,
} from '../../../../../../services/ai-conversation.service';

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

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

const API_BASE_URL = 'http://localhost:3000';

const SUGGESTIONS = [
  'Quelle est la différence entre NumPy et Pandas ?',
  'Comment sécuriser une API REST ?',
  'Comment éviter le data leakage avec Scikit-learn ?',
  'Quels sont les principes de la Clean Architecture ?',
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

function aiMessageToMessage(m: AiMessage): Message {
  return {
    id: String(m.id),
    content: m.content,
    role: m.role,
    timestamp: new Date(m.createdAt),
    error: m.isError,
    sources: m.sources?.length ? (m.sources as RagSource[]) : undefined,
  };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Component                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */

export default function AssistantPage() {
  /* ── Sidebar state ── */
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingConvs, setLoadingConvs] = useState(true);

  /* ── Active conversation ── */
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  /* ── Input ── */
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  /* ── Rename ── */
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  /* ── Refs ── */
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  /* ─────────── Load conversations ─────────── */
  const loadConversations = useCallback(async () => {
    try {
      const data = await aiConversationService.list();
      setConversations(data);
    } catch {
      /* ignore */
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  /* ─────────── Load messages for active conversation ─────────── */
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    setLoadingMsgs(true);
    aiConversationService.get(activeId)
      .then((conv) => setMessages(conv.messages.map(aiMessageToMessage)))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMsgs(false));
  }, [activeId]);

  /* ─────────── Scroll to bottom ─────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /* ─────────── Focus edit input ─────────── */
  useEffect(() => {
    if (editingId !== null) editInputRef.current?.focus();
  }, [editingId]);

  /* ─────────── Send message ─────────── */
  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = {
      id: `tmp-${Date.now()}`,
      content: trimmed,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsTyping(true);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ q: trimmed, conversationId: activeId ?? undefined }),
      });

      if (!res.ok) throw new Error(`Erreur serveur (${res.status})`);

      const data = await res.json();

      // Set active conversation id returned by backend
      if (data.conversationId && activeId !== data.conversationId) {
        setActiveId(data.conversationId);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `tmp-${Date.now() + 1}`,
          content: data.answer ?? 'Aucune réponse disponible.',
          role: 'assistant',
          timestamp: new Date(),
          sources: data.sources?.length ? data.sources : undefined,
        },
      ]);

      // Refresh sidebar list (new conv or updated preview)
      loadConversations();
    } catch (error: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: `tmp-${Date.now() + 1}`,
          content: error instanceof Error ? error.message : 'Une erreur est survenue.',
          role: 'assistant',
          timestamp: new Date(),
          error: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  /* ─────────── New conversation ─────────── */
  const handleNewConversation = () => {
    setActiveId(null);
    setMessages([]);
    inputRef.current?.focus();
  };

  /* ─────────── Select conversation ─────────── */
  const handleSelectConversation = (id: number) => {
    if (id === activeId) return;
    setActiveId(id);
  };

  /* ─────────── Pin / Unpin ─────────── */
  const handleTogglePin = async (e: React.MouseEvent, conv: AiConversation) => {
    e.stopPropagation();
    try {
      await aiConversationService.update(conv.id, { pinned: !conv.pinned });
      setConversations((prev) =>
        prev
          .map((c) => (c.id === conv.id ? { ...c, pinned: !c.pinned } : c))
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          }),
      );
    } catch { /* ignore */ }
  };

  /* ─────────── Delete ─────────── */
  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Supprimer cette conversation ?')) return;
    try {
      await aiConversationService.delete(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) { setActiveId(null); setMessages([]); }
    } catch { /* ignore */ }
  };

  /* ─────────── Rename ─────────── */
  const startEdit = (e: React.MouseEvent, conv: AiConversation) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const confirmEdit = async () => {
    if (!editingId || !editingTitle.trim()) { setEditingId(null); return; }
    try {
      await aiConversationService.update(editingId, { title: editingTitle.trim() });
      setConversations((prev) =>
        prev.map((c) => (c.id === editingId ? { ...c, title: editingTitle.trim() } : c)),
      );
    } catch { /* ignore */ }
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  /* ─────────── Grouped conversations ─────────── */
  const pinned = conversations.filter((c) => c.pinned);
  const recent = conversations.filter((c) => !c.pinned);

  const isFirstMessage = messages.length === 0 && !loadingMsgs;

  /* ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-950 overflow-hidden">

      {/* ══════════════ SIDEBAR ══════════════ */}
      <aside className={`flex-shrink-0 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ${sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'}`}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Conversations</span>
          <button
            onClick={handleNewConversation}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-[#168F6F] text-white rounded-lg hover:bg-[#0F6B54] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          {loadingConvs ? (
            <div className="space-y-2 px-3 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <MessageSquare className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-xs text-gray-400 dark:text-gray-500">Aucune conversation</p>
            </div>
          ) : (
            <>
              {/* Pinned */}
              {pinned.length > 0 && (
                <div className="mb-1">
                  <p className="px-4 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider flex items-center gap-1">
                    <Pin className="h-3 w-3" /> Épinglées
                  </p>
                  {pinned.map((conv) => (
                    <ConvItem
                      key={conv.id}
                      conv={conv}
                      active={activeId === conv.id}
                      editingId={editingId}
                      editingTitle={editingTitle}
                      editInputRef={editInputRef}
                      onSelect={handleSelectConversation}
                      onTogglePin={handleTogglePin}
                      onDelete={handleDelete}
                      onStartEdit={startEdit}
                      onConfirmEdit={confirmEdit}
                      onCancelEdit={cancelEdit}
                      setEditingTitle={setEditingTitle}
                    />
                  ))}
                </div>
              )}

              {/* Recent */}
              {recent.length > 0 && (
                <div>
                  {pinned.length > 0 && (
                    <p className="px-4 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">
                      Récentes
                    </p>
                  )}
                  {recent.map((conv) => (
                    <ConvItem
                      key={conv.id}
                      conv={conv}
                      active={activeId === conv.id}
                      editingId={editingId}
                      editingTitle={editingTitle}
                      editInputRef={editInputRef}
                      onSelect={handleSelectConversation}
                      onTogglePin={handleTogglePin}
                      onDelete={handleDelete}
                      onStartEdit={startEdit}
                      onConfirmEdit={confirmEdit}
                      onCancelEdit={cancelEdit}
                      setEditingTitle={setEditingTitle}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* ══════════════ MAIN AREA ══════════════ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          {/* Toggle sidebar */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
            title={sidebarOpen ? 'Masquer le panneau' : 'Afficher le panneau'}
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#168F6F] to-[#0F6B54] flex items-center justify-center shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {activeId
                ? (conversations.find((c) => c.id === activeId)?.title ?? 'Assistant IA')
                : 'Assistant IA'}
            </h1>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Explorez les publications par l'intelligence artificielle</p>
          </div>

        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
          <div className="max-w-3xl mx-auto flex flex-col gap-6">

            {/* Loading skeleton */}
            {loadingMsgs && (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state — suggestions */}
            {isFirstMessage && !loadingMsgs && (
              <div className="flex flex-col items-center gap-6 py-12">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#168F6F] to-[#0F6B54] flex items-center justify-center shadow-lg">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Comment puis-je vous aider ?
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md">
                    Posez une question sur les publications disponibles. Je rechercherai les informations pertinentes et vous fournirai une réponse sourcée.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-left px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:border-[#168F6F] hover:text-[#168F6F] hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                  message.role === 'assistant'
                    ? message.error ? 'bg-red-500' : 'bg-gradient-to-br from-[#168F6F] to-[#0F6B54]'
                    : 'bg-gray-200 dark:bg-gray-700'
                } text-white`}>
                  {message.role === 'assistant'
                    ? message.error ? <AlertCircle className="h-4 w-4" /> : <Bot className="h-4 w-4" />
                    : <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />}
                </div>

                {/* Content */}
                <div className={`flex flex-col gap-2 ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                  style={{ maxWidth: 'calc(100% - 44px)' }}>

                  {/* Bubble */}
                  <div className={`px-4 py-3 text-sm break-words ${
                    message.role === 'user'
                      ? 'bg-[#168F6F] text-white rounded-2xl rounded-tr-sm'
                      : message.error
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-2xl rounded-tl-sm'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 dark:border-gray-700'
                  }`}>
                    {message.error
                      ? message.content
                      : <MarkdownMessage content={message.content} isUser={message.role === 'user'} />
                    }
                  </div>

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="w-full flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        Sources
                      </span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {message.sources.map((source) => (
                          <Link
                            key={`${source.publicationId}-${source.chunkIndex}`}
                            href={`/home?publication=${source.publicationId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-3 py-2 text-xs hover:border-[#168F6F]/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all group"
                          >
                            <span className="text-gray-700 dark:text-gray-300 truncate font-medium group-hover:text-[#168F6F] transition-colors">
                              {source.title}
                            </span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-[#168F6F] font-bold tabular-nums">
                                {Math.round(source.similarity * 100)}%
                              </span>
                              <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-[#168F6F] transition-colors" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <span className="text-[10px] text-gray-400 dark:text-gray-600 px-1">
                    {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#168F6F] to-[#0F6B54] flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <span className="h-2 w-2 bg-[#168F6F] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 bg-[#168F6F] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 bg-[#168F6F] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Input ── */}
        <div className="flex-shrink-0 px-4 py-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-700 focus-within:border-[#168F6F] focus-within:ring-1 focus-within:ring-[#168F6F]/30 transition-all">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question... (Entrée pour envoyer)"
                disabled={isTyping}
                className="flex-1 resize-none bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none disabled:opacity-60 leading-relaxed"
                style={{ minHeight: '24px', maxHeight: '160px' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                className="flex-shrink-0 p-2 bg-[#168F6F] text-white rounded-xl hover:bg-[#0F6B54] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Envoyer"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-2 text-center">
              Maj+Entrée pour une nouvelle ligne · Les réponses sont basées uniquement sur les publications disponibles
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar       { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb       { background: #374151; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4b5563; }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  ConvItem — single conversation row in the sidebar                          */
/* ─────────────────────────────────────────────────────────────────────────── */

interface ConvItemProps {
  conv: AiConversation;
  active: boolean;
  editingId: number | null;
  editingTitle: string;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (id: number) => void;
  onTogglePin: (e: React.MouseEvent, conv: AiConversation) => void;
  onDelete: (e: React.MouseEvent, id: number) => void;
  onStartEdit: (e: React.MouseEvent, conv: AiConversation) => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
  setEditingTitle: (v: string) => void;
}

function ConvItem({
  conv, active, editingId, editingTitle, editInputRef,
  onSelect, onTogglePin, onDelete, onStartEdit, onConfirmEdit, onCancelEdit,
  setEditingTitle,
}: ConvItemProps) {
  const isEditing = editingId === conv.id;

  return (
    <div
      onClick={() => !isEditing && onSelect(conv.id)}
      className={`group relative flex items-start gap-2 px-3 py-2.5 mx-2 rounded-xl cursor-pointer transition-colors ${
        active
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-[#168F6F]/30'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
      }`}
    >
      {/* Icon */}
      <MessageSquare className={`h-4 w-4 flex-shrink-0 mt-0.5 ${active ? 'text-[#168F6F]' : 'text-gray-400'}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              ref={editInputRef}
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onConfirmEdit();
                if (e.key === 'Escape') onCancelEdit();
              }}
              className="flex-1 text-xs bg-white dark:bg-gray-700 border border-[#168F6F] rounded px-1.5 py-0.5 text-gray-900 dark:text-white focus:outline-none"
            />
            <button onClick={onConfirmEdit} className="text-[#168F6F] hover:text-[#0F6B54]"><Check className="h-3.5 w-3.5" /></button>
            <button onClick={onCancelEdit} className="text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>
          </div>
        ) : (
          <>
            <p className={`text-xs font-medium truncate ${active ? 'text-[#168F6F]' : 'text-gray-700 dark:text-gray-300'}`}>
              {conv.title}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
              {formatDate(conv.updatedAt)} · {conv.messageCount} msg
            </p>
          </>
        )}
      </div>

      {/* Actions — visible on hover */}
      {!isEditing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {/* Pin */}
          <button
            onClick={(e) => onTogglePin(e, conv)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-[#168F6F] transition-colors"
            title={conv.pinned ? 'Désépingler' : 'Épingler'}
          >
            {conv.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
          </button>
          {/* Rename */}
          <button
            onClick={(e) => onStartEdit(e, conv)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors"
            title="Renommer"
          >
            <Pencil className="h-3 w-3" />
          </button>
          {/* Delete */}
          <button
            onClick={(e) => onDelete(e, conv.id)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
