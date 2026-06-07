'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Bot, User, AlertCircle, BookOpen, ExternalLink, Sparkles,
  Plus, Trash2, Pin, PinOff, Pencil, Check, X, Download,
  ChevronLeft, ChevronRight, Search, Database, Cpu,
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
/*  Types                                                                        */
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

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                      */
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
  if (diffDays < 7) return `Il y a ${diffDays} j`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function exportConversation(title: string, messages: Message[]) {
  const lines = [`# ${title}`, `Exporté le ${new Date().toLocaleDateString('fr-FR')}`, ''];
  for (const m of messages) {
    lines.push(`## ${m.role === 'user' ? 'Vous' : 'Assistant IA'}`);
    lines.push(m.content);
    if (m.sources?.length) {
      lines.push('');
      lines.push('**Sources :**');
      for (const s of m.sources) lines.push(`- ${s.title} (${Math.round(s.similarity * 100)}%)`);
    }
    lines.push('');
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, '_').slice(0, 50)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Component                                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */

export default function AssistantPage() {
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [loadingConvs, setLoadingConvs]   = useState(true);

  const [activeId, setActiveId]     = useState<number | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [input, setInput]       = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [editingId, setEditingId]       = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const editInputRef   = useRef<HTMLInputElement>(null);

  /* ── Load conversations ── */
  const loadConversations = useCallback(async () => {
    try {
      const data = await aiConversationService.list();
      setConversations(data);
    } catch { /* ignore */ }
    finally { setLoadingConvs(false); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  /* ── Load messages ── */
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    setLoadingMsgs(true);
    aiConversationService.get(activeId)
      .then((c) => setMessages(c.messages.map(aiMessageToMessage)))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMsgs(false));
  }, [activeId]);

  /* ── Scroll to bottom only when there are messages ── */
  useEffect(() => {
    if (messages.length === 0 && !isTyping) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /* ── Focus rename input ── */
  useEffect(() => {
    if (editingId !== null) editInputRef.current?.focus();
  }, [editingId]);

  /* ── Send ── */
  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    setMessages((prev) => [...prev, {
      id: `tmp-${Date.now()}`, content: trimmed, role: 'user', timestamp: new Date(),
    }]);
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

      if (data.conversationId && activeId !== data.conversationId) {
        setActiveId(data.conversationId);
      }

      setMessages((prev) => [...prev, {
        id: `tmp-${Date.now() + 1}`,
        content: data.answer ?? 'Aucune réponse disponible.',
        role: 'assistant',
        timestamp: new Date(),
        sources: data.sources?.length ? data.sources : undefined,
      }]);

      loadConversations();
    } catch (error: unknown) {
      setMessages((prev) => [...prev, {
        id: `tmp-${Date.now() + 1}`,
        content: error instanceof Error ? error.message : 'Une erreur est survenue.',
        role: 'assistant',
        timestamp: new Date(),
        error: true,
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  /* ── Conversation actions ── */
  const handleNewConversation = () => { setActiveId(null); setMessages([]); inputRef.current?.focus(); };
  const handleSelect = (id: number) => { if (id !== activeId) setActiveId(id); };

  const handleTogglePin = async (e: React.MouseEvent, conv: AiConversation) => {
    e.stopPropagation();
    try {
      await aiConversationService.update(conv.id, { pinned: !conv.pinned });
      setConversations((prev) =>
        prev.map((c) => c.id === conv.id ? { ...c, pinned: !c.pinned } : c)
            .sort((a, b) => {
              if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
              return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            }),
      );
    } catch { /* ignore */ }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Supprimer cette conversation ?')) return;
    try {
      await aiConversationService.delete(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) { setActiveId(null); setMessages([]); }
    } catch { /* ignore */ }
  };

  const startEdit = (e: React.MouseEvent, conv: AiConversation) => {
    e.stopPropagation(); setEditingId(conv.id); setEditingTitle(conv.title);
  };
  const confirmEdit = async () => {
    if (!editingId || !editingTitle.trim()) { setEditingId(null); return; }
    try {
      await aiConversationService.update(editingId, { title: editingTitle.trim() });
      setConversations((prev) => prev.map((c) => c.id === editingId ? { ...c, title: editingTitle.trim() } : c));
    } catch { /* ignore */ }
    setEditingId(null);
  };
  const cancelEdit = () => setEditingId(null);

  const handleExport = (e: React.MouseEvent, conv: AiConversation) => {
    e.stopPropagation();
    if (activeId === conv.id && messages.length > 0) {
      exportConversation(conv.title, messages);
    } else {
      aiConversationService.get(conv.id).then((d) =>
        exportConversation(d.title, d.messages.map(aiMessageToMessage)));
    }
  };

  const pinned  = conversations.filter((c) => c.pinned);
  const recent  = conversations.filter((c) => !c.pinned);
  const isEmpty = messages.length === 0 && !loadingMsgs;
  const activeTitle = conversations.find((c) => c.id === activeId)?.title;

  /* ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex h-full overflow-hidden bg-gray-50 dark:bg-gray-950">

      {/* ══════ SIDEBAR ══════ */}
      <aside className={`flex-shrink-0 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100 dark:border-gray-800">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Conversations</span>
          <button
            onClick={handleNewConversation}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-[#168F6F] text-white rounded-lg hover:bg-[#0F6B54] transition-colors"
          >
            <Plus className="h-3 w-3" /> Nouveau
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingConvs ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2">
                <Sparkles className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">Aucune conversation</p>
              <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">Posez une première question</p>
            </div>
          ) : (
            <div className="py-2">
              {pinned.length > 0 && (
                <div className="mb-1">
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider flex items-center gap-1">
                    <Pin className="h-2.5 w-2.5" /> Épinglées
                  </p>
                  {pinned.map((conv) => (
                    <ConvItem key={conv.id} conv={conv} active={activeId === conv.id}
                      editingId={editingId} editingTitle={editingTitle} editInputRef={editInputRef}
                      onSelect={handleSelect} onTogglePin={handleTogglePin} onDelete={handleDelete}
                      onStartEdit={startEdit} onConfirmEdit={confirmEdit} onCancelEdit={cancelEdit}
                      onExport={handleExport} setEditingTitle={setEditingTitle} />
                  ))}
                </div>
              )}
              {recent.length > 0 && (
                <div>
                  {pinned.length > 0 && (
                    <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">
                      Récentes
                    </p>
                  )}
                  {recent.map((conv) => (
                    <ConvItem key={conv.id} conv={conv} active={activeId === conv.id}
                      editingId={editingId} editingTitle={editingTitle} editInputRef={editInputRef}
                      onSelect={handleSelect} onTogglePin={handleTogglePin} onDelete={handleDelete}
                      onStartEdit={startEdit} onConfirmEdit={confirmEdit} onCancelEdit={cancelEdit}
                      onExport={handleExport} setEditingTitle={setEditingTitle} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ══════ MAIN ══════ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#168F6F] to-[#0F6B54] flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
              {activeTitle ?? 'Assistant IA'}
            </h1>
            {!activeTitle && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">
                Explorez les publications par l'intelligence artificielle
              </p>
            )}
          </div>

          {/* {activeId && messages.length > 0 && (
            <button
              onClick={() => { const c = conversations.find((x) => x.id === activeId); if (c) exportConversation(c.title, messages); }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-[#168F6F] hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
              title="Exporter"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          )} */}
        </div>

        {/* Messages zone */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isEmpty ? (
            /* ── Empty state ── */
            <div className="h-full flex items-center justify-center px-6">
              <div className="w-full max-w-xl flex flex-col gap-5">

                {/* Hero row */}
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-gradient-to-br from-[#168F6F] to-[#0F6B54] flex items-center justify-center shadow-md">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                      Comment puis-je vous aider ?
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Posez une question sur les publications de la plateforme.
                    </p>
                  </div>
                </div>

                {/* RAG card */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-[#168F6F]" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Comment fonctionne l'assistant ?
                    </span>
                  </div>
                  <div className="px-4 py-4 flex flex-col gap-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Cet assistant utilise la technologie{' '}
                      <span className="font-semibold text-gray-800 dark:text-gray-200">RAG</span>{' '}
                      (Retrieval-Augmented Generation) : il{' '}
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        recherche d'abord dans les publications ImKnow
                      </span>{' '}
                      les passages les plus pertinents, puis demande à un LLM de synthétiser une
                      réponse basée exclusivement sur ces extraits — avec sources et scores de pertinence.
                    </p>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { icon: <Search className="h-4 w-4 text-[#168F6F]" />, step: '1', title: 'Recherche sémantique', desc: 'La question est vectorisée et comparée aux chunks des publications' },
                        { icon: <Database className="h-4 w-4 text-[#168F6F]" />, step: '2', title: 'Sélection des sources', desc: 'Les passages les plus proches sémantiquement sont classés par score' },
                        { icon: <Cpu className="h-4 w-4 text-[#168F6F]" />, step: '3', title: 'Génération LLM', desc: 'Le LLM synthétise une réponse à partir de ces extraits uniquement' },
                      ].map((s) => (
                        <div key={s.step} className="flex flex-col gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                              {s.icon}
                            </div>
                            <span className="text-[10px] font-bold text-[#168F6F] uppercase tracking-wider">{s.step}</span>
                          </div>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-tight">{s.title}</p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-snug">{s.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* ── Conversation ── */
            <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">

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

              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 text-white ${
                    msg.role === 'assistant'
                      ? msg.error ? 'bg-red-500' : 'bg-gradient-to-br from-[#168F6F] to-[#0F6B54]'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}>
                    {msg.role === 'assistant'
                      ? msg.error ? <AlertCircle className="h-4 w-4" /> : <Bot className="h-4 w-4" />
                      : <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />}
                  </div>

                  {/* Bubble */}
                  <div className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    style={{ maxWidth: 'calc(100% - 44px)' }}>
                    <div className={`px-4 py-3 text-sm break-words ${
                      msg.role === 'user'
                        ? 'bg-[#168F6F] text-white rounded-2xl rounded-tr-sm'
                        : msg.error
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-2xl rounded-tl-sm'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 dark:border-gray-700'
                    }`}>
                      {msg.error
                        ? msg.content
                        : <MarkdownMessage content={msg.content} isUser={msg.role === 'user'} />}
                    </div>

                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="w-full flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                          <BookOpen className="h-3 w-3" /> Sources
                        </span>
                        {msg.sources.map((src) => (
                          <Link
                            key={`${src.publicationId}-${src.chunkIndex}`}
                            href={`/home?publication=${src.publicationId}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-3 py-2 text-xs hover:border-[#168F6F]/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all group"
                          >
                            <span className="text-gray-700 dark:text-gray-300 truncate font-medium group-hover:text-[#168F6F] transition-colors">
                              {src.title}
                            </span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-[#168F6F] font-bold tabular-nums">{Math.round(src.similarity * 100)}%</span>
                              <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-[#168F6F] transition-colors" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}

                    <span className="text-[10px] text-gray-400 dark:text-gray-600 px-1">
                      {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {/* Typing */}
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
          )}
        </div>

        {/* ── Input ── */}
        <div className="flex-shrink-0 px-4 py-2 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2 items-center bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 focus-within:border-[#168F6F] focus-within:ring-1 focus-within:ring-[#168F6F]/30 transition-all">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question... (Entrée pour envoyer)"
                disabled={isTyping}
                className="flex-1 resize-none bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none disabled:opacity-60 leading-relaxed"
                style={{ minHeight: '22px', maxHeight: '120px' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                className="flex-shrink-0 p-1.5 bg-[#168F6F] text-white rounded-lg hover:bg-[#0F6B54] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Envoyer"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1 text-center">
              Maj+Entrée pour une nouvelle ligne · Réponses basées uniquement sur les publications disponibles
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar       { width: 4px; }
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
/*  ConvItem                                                                     */
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
  onExport: (e: React.MouseEvent, conv: AiConversation) => void;
  setEditingTitle: (v: string) => void;
}

function ConvItem({
  conv, active, editingId, editingTitle, editInputRef,
  onSelect, onTogglePin, onDelete, onStartEdit, onConfirmEdit, onCancelEdit,
  onExport, setEditingTitle,
}: ConvItemProps) {
  const isEditing = editingId === conv.id;

  return (
    <div
      onClick={() => !isEditing && onSelect(conv.id)}
      className={`group relative flex items-center gap-2 px-3 py-2 mx-1.5 rounded-lg cursor-pointer transition-all ${
        active
          ? 'bg-emerald-50 dark:bg-emerald-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
      }`}
    >
      {/* Active indicator */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#168F6F] rounded-full" />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 pl-1">
        {isEditing ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              ref={editInputRef}
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onConfirmEdit(); if (e.key === 'Escape') onCancelEdit(); }}
              className="flex-1 text-xs bg-white dark:bg-gray-700 border border-[#168F6F] rounded px-1.5 py-0.5 text-gray-900 dark:text-white focus:outline-none"
            />
            <button onClick={onConfirmEdit} className="text-[#168F6F] hover:text-[#0F6B54]"><Check className="h-3 w-3" /></button>
            <button onClick={onCancelEdit} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
          </div>
        ) : (
          <>
            <p className={`text-xs font-medium truncate leading-snug ${active ? 'text-[#168F6F]' : 'text-gray-700 dark:text-gray-300'}`}>
              {conv.title}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
              {formatDate(conv.updatedAt)} · {conv.messageCount} msg
            </p>
          </>
        )}
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={(e) => onTogglePin(e, conv)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-[#168F6F] transition-colors" title={conv.pinned ? 'Désépingler' : 'Épingler'}>
            {conv.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
          </button>
          <button onClick={(e) => onStartEdit(e, conv)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors" title="Renommer">
            <Pencil className="h-3 w-3" />
          </button>
          {/* <button onClick={(e) => onExport(e, conv)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-purple-500 transition-colors" title="Exporter">
            <Download className="h-3 w-3" />
          </button> */}
          <button onClick={(e) => onDelete(e, conv.id)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors" title="Supprimer">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
