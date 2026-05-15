// components/chat/MessageInput.tsx
import React, { useState, useRef, useCallback } from 'react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onSendFile: (file: File) => Promise<void>;
  isLoading: boolean;
  placeholder?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendFile,
  isLoading,
  placeholder = 'Type a message...',
}) => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSendingFile, setIsSendingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDisabled = isLoading || isSendingFile;

  const clearError = useCallback(() => setError(null), []);

  const scheduleErrorClear = useCallback((ms = 5000) => {
    const id = setTimeout(clearError, ms);
    return () => clearTimeout(id);
  }, [clearError]);

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed || isDisabled) return;
    onSendMessage(trimmed);
    setMessage('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, isDisabled, onSendMessage]);

  // Replace deprecated onKeyPress with onKeyDown
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Keep value update and height adjustment separate for clarity
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-grow up to 120 px
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const validateFile = useCallback((file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      const mb = (file.size / 1024 / 1024).toFixed(2);
      setError(`File too large (${mb} MB). Maximum size is 10 MB.`);
      return false;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number])) {
      setError('Invalid file type. Allowed: Images, PDF, DOC, DOCX, TXT.');
      return false;
    }
    return true;
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Reset input so the same file can be re-selected after an error
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (!file) return;

      if (!validateFile(file)) {
        scheduleErrorClear();
        return;
      }

      setIsSendingFile(true);
      setError(null);
      try {
        await onSendFile(file);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error sending file. Please try again.';
        setError(msg);
        scheduleErrorClear();
      } finally {
        setIsSendingFile(false);
      }
    },
    [validateFile, onSendFile, scheduleErrorClear],
  );

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-2 px-3 py-2 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1">{error}</span>
            <button
              onClick={clearError}
              aria-label="Dismiss error"
              className="text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-end space-x-2">
          {/* Attach file button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isDisabled}
            aria-label="Attach file (max 10 MB)"
            className="p-2 text-gray-500 hover:text-[#00926B] dark:text-gray-400 dark:hover:text-[#00B383] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
            aria-hidden="true"
          />

          {/* Message textarea */}
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}   // ← replaces deprecated onKeyPress
              placeholder={isSendingFile ? 'Sending file…' : placeholder}
              disabled={isDisabled}
              rows={1}
              aria-label="Message input"
              className="w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00926B] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ maxHeight: '120px' }}
            />
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!message.trim() || isDisabled}
            aria-label={isSendingFile ? 'Sending file…' : 'Send message'}
            className="p-2 bg-[#00926B] text-white rounded-lg hover:bg-[#00B383] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading || isSendingFile ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>

      
      </div>
    </div>
  );
};

export default MessageInput;