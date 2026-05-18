// components/chat/SearchResults.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { ChatMessage } from '../../../services/chat.service';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from '../../context/LanguageContext';

interface SearchResultsProps {
  results: ChatMessage[];
  loading: boolean;
  onClose: () => void;
  onMessageClick?: (message: ChatMessage) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  loading,
  onClose,
  onMessageClick,
}) => {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) setCurrentUserId(Number(userId));
  }, []);

  const getSenderLabel = (message: ChatMessage): string =>
    message.senderId === currentUserId ? t('chat.sender_you') : t('chat.sender_user');

  const getDisplayContent = (message: ChatMessage): string => {
    if (message.type === 'image') return '📷 Image';
    if (message.type === 'file') return `📎 ${message.filename ?? 'File'}`;
    return message.content;
  };

  const truncate = (text: string, max = 100): string =>
    text.length <= max ? text : `${text.substring(0, max)}…`;

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-center space-x-2 text-gray-500" role="status">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#00926B]" aria-hidden="true" />
          <span>{t('chat.searching')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 sticky top-0 z-10">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('chat.search_results', { count: results.length })}
        </h3>
        <button
          onClick={onClose}
          aria-label="Close search results"
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-4">
            <svg
              className="w-16 h-16 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">{t('chat.no_msgs_found')}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('chat.try_keywords')}</p>
          </div>
        ) : (
          <ul>
            {results.map((message) => (
              <li key={message.id}>
                <button
                  onClick={() => onMessageClick?.(message)}
                  className="w-full text-left p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-medium text-[#00926B] dark:text-[#00B383]">
                      {getSenderLabel(message)}
                    </span>
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white line-clamp-2 break-words">
                    {truncate(getDisplayContent(message))}
                  </p>
                  {message.isEdited && (
                    <span className="text-xs text-gray-400 mt-1 inline-block">{t('chat.edited')}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SearchResults;