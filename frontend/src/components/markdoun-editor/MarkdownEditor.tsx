// components/markdoun-editor/MarkdownEditor.tsx
'use client';

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Image as ImageIcon,
  Link as LinkIcon,
  Eye,
  Loader2,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Table,
  FileCode,
  CheckSquare,
  Minus,
  Type
} from 'lucide-react';
import MarkdownPreview from './MarkdownPreview';
import { useTranslation } from '@/context/LanguageContext';

export interface MarkdownEditorRef {
  textarea: HTMLTextAreaElement | null;
  getTextarea: () => HTMLTextAreaElement | null;
}

interface MarkdownEditorProps {
  content: string;
  setContent: (content: string) => void;
  isSubmitting: boolean;
  isUploadingImage: boolean;
  uploadProgress: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
  insertMarkdown: (type: string) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
}

const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(({
  content,
  setContent,
  isSubmitting,
  isUploadingImage,
  uploadProgress,
  fileInputRef,
  insertMarkdown,
  handleImageUpload,
  showPreview,
  setShowPreview
}, ref) => {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    textarea: textareaRef.current,
    getTextarea: () => textareaRef.current
  }));

  useEffect(() => {
    // textarea ref ready
  }, []);

  // Fonction pour insérer du texte à la position du curseur
  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + text);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.substring(0, start) + text + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + text.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleToolbarClick = (type: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      // Fallback: utiliser insertMarkdown du parent
      insertMarkdown(type);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let newText = '';
    let cursorOffset = 0;
    
    switch (type) {
      case 'heading1':
        newText = `# ${selectedText || t('markdown_editor.md_heading1')}`;
        cursorOffset = newText.length;
        break;
      case 'heading2':
        newText = `## ${selectedText || t('markdown_editor.md_heading2')}`;
        cursorOffset = newText.length;
        break;
      case 'heading3':
        newText = `### ${selectedText || t('markdown_editor.md_heading3')}`;
        cursorOffset = newText.length;
        break;
      case 'bold':
        newText = `**${selectedText || t('markdown_editor.md_bold')}**`;
        cursorOffset = newText.length;
        break;
      case 'italic':
        newText = `*${selectedText || t('markdown_editor.md_italic')}*`;
        cursorOffset = newText.length;
        break;
      case 'code':
        newText = `\`${selectedText || t('markdown_editor.md_code')}\``;
        cursorOffset = newText.length;
        break;
      case 'quote':
        newText = `> ${selectedText || t('markdown_editor.md_quote')}\n`;
        cursorOffset = newText.length;
        break;
      case 'list':
        newText = `- ${selectedText || t('markdown_editor.md_list')}\n`;
        cursorOffset = newText.length;
        break;
      case 'orderedlist':
        newText = `1. ${selectedText || t('markdown_editor.md_ordered_list')}\n`;
        cursorOffset = newText.length;
        break;
      case 'checkbox':
        newText = `- [ ] ${selectedText || t('markdown_editor.md_checkbox')}\n`;
        cursorOffset = newText.length;
        break;
      case 'hr':
        newText = `\n---\n`;
        cursorOffset = newText.length;
        break;
      case 'codeblock': {
        newText = `\`\`\`javascript\n${selectedText || t('markdown_editor.md_code_placeholder')}\n\`\`\`\n`;
        cursorOffset = newText.length;
        break;
      }
      case 'link': {
        const text = selectedText || t('markdown_editor.md_link_text');
        newText = `[${text}](https://)`;
        cursorOffset = newText.length;
        break;
      }
      case 'table':
        newText = `\n| ${t('markdown_editor.md_col1')} | ${t('markdown_editor.md_col2')} | ${t('markdown_editor.md_col3')} |\n|-----------|-----------|-----------|\n| ${t('markdown_editor.md_cell1')} | ${t('markdown_editor.md_cell2')} | ${t('markdown_editor.md_cell3')} |\n| ${t('markdown_editor.md_cell4')} | ${t('markdown_editor.md_cell5')} | ${t('markdown_editor.md_cell6')} |\n`;
        cursorOffset = newText.length;
        break;
      default:
        // Utiliser la fonction parent pour les types non gérés
        insertMarkdown(type);
        return;
    }
    
    const updatedContent = content.substring(0, start) + newText + content.substring(end);
    setContent(updatedContent);
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + cursorOffset;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Fonction pour l'upload de fichiers (utilise handleImageUpload du parent)
  const onFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Utiliser la fonction parent pour gérer l'upload
    handleImageUpload(e);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('markdown_editor.label_content')} <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t('markdown_editor.chars_count', {
              chars: content.length,
              words: content.split(/\s+/).filter(word => word.length > 0).length,
            })}
          </div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            disabled={isSubmitting}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors disabled:opacity-50 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Eye size={16} />
            {showPreview ? t('markdown_editor.btn_edit') : t('markdown_editor.btn_preview')}
          </button>
        </div>
      </div>

      {showPreview ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 min-h-[300px] border border-gray-300 dark:border-gray-700">
          {content ? (
            <MarkdownPreview content={content} />
          ) : (
            <div className="text-gray-400 dark:text-gray-500 italic text-center py-10">
              {t('markdown_editor.preview_empty')}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-t-lg">
            {/* Headings */}
            <div className="flex items-center gap-1 mr-2 border-r border-gray-300 dark:border-gray-700 pr-2">
              <button 
                onClick={() => handleToolbarClick('heading1')}
                disabled={isSubmitting}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50" 
                title={t('markdown_editor.toolbar_h1')}
              >
                <Heading1 size={18} className="text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={() => handleToolbarClick('heading2')}
                disabled={isSubmitting}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                title={t('markdown_editor.toolbar_h2')}
              >
                <Heading2 size={18} className="text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={() => handleToolbarClick('heading3')}
                disabled={isSubmitting}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                title={t('markdown_editor.toolbar_h3')}
              >
                <Heading3 size={18} className="text-gray-700 dark:text-gray-300" />
              </button>
            </div>

            {/* Text formatting */}
            <div className="flex items-center gap-1 mr-2 border-r border-gray-300 dark:border-gray-700 pr-2">
              <button 
                onClick={() => handleToolbarClick('bold')}
                disabled={isSubmitting}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50" 
                title={t('markdown_editor.toolbar_bold')}
              >
                <Bold size={18} className="text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={() => handleToolbarClick('italic')}
                disabled={isSubmitting}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                title={t('markdown_editor.toolbar_italic')}
              >
                <Italic size={18} className="text-gray-700 dark:text-gray-300" />
              </button>
            </div>

            {/* Lists */}
            <div className="flex items-center gap-1 mr-2 border-r border-gray-300 dark:border-gray-700 pr-2">
              <button 
                onClick={() => handleToolbarClick('list')}
                disabled={isSubmitting}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50" 
                title={t('markdown_editor.toolbar_ul')}
              >
                <List size={18} className="text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={() => handleToolbarClick('orderedlist')}
                disabled={isSubmitting}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                title={t('markdown_editor.toolbar_ol')}
              >
                <ListOrdered size={18} className="text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={() => handleToolbarClick('checkbox')}
                disabled={isSubmitting}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                title={t('markdown_editor.toolbar_checkbox')}
              >
                <CheckSquare size={18} className="text-gray-700 dark:text-gray-300" />
              </button>
            </div>

            {/* Code */}
            <div className="flex items-center gap-1 mr-2 border-r border-gray-300 dark:border-gray-700 pr-2">
              <button 
                onClick={() => handleToolbarClick('code')}
                disabled={isSubmitting}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50" 
                title={t('markdown_editor.toolbar_code')}
              >
                <Code size={18} className="text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={() => handleToolbarClick('codeblock')}
                disabled={isSubmitting}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                title={t('markdown_editor.toolbar_codeblock')}
              >
                <FileCode size={18} className="text-gray-700 dark:text-gray-300" />
              </button>
            </div>

            {/* Media & Links */}
            <div className="flex items-center gap-1 mr-2 border-r border-gray-300 dark:border-gray-700 pr-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileUpload}
                multiple
                accept="image/*,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                disabled={isSubmitting}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || isUploadingImage}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 flex items-center gap-1" 
                title={t('markdown_editor.toolbar_image')}
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-xs">{uploadProgress}%</span>
                  </>
                ) : (
                  <ImageIcon size={18} className="text-gray-700 dark:text-gray-300" />
                )}
              </button>
              <button 
                onClick={() => handleToolbarClick('link')}
                disabled={isSubmitting}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50" 
                title={t('markdown_editor.toolbar_link')}
              >
                <LinkIcon size={18} className="text-gray-700 dark:text-gray-300" />
              </button>
            </div>

            {/* Extras */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => handleToolbarClick('quote')}
                disabled={isSubmitting}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50" 
                title={t('markdown_editor.toolbar_quote')}
              >
                <Quote size={18} className="text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={() => handleToolbarClick('table')}
                disabled={isSubmitting}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                title={t('markdown_editor.toolbar_table')}
              >
                <Table size={18} className="text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={() => handleToolbarClick('hr')}
                disabled={isSubmitting}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                title={t('markdown_editor.toolbar_hr')}
              >
                <Minus size={18} className="text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          </div>

          {/* Éditeur */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('markdown_editor.placeholder')}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 border-t-0 rounded-b-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 min-h-[300px] resize-y custom-scrollbar disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed bg-white dark:bg-gray-800 font-mono text-sm"
              spellCheck="true"
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Type size={12} />
              <span>{t('markdown_editor.markdown_supported')}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

MarkdownEditor.displayName = 'MarkdownEditor';
export default MarkdownEditor;