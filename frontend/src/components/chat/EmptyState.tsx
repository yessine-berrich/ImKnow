// components/chat/EmptyState.tsx
import React from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  title = "No conversation selected", 
  description = "Choose a conversation from the sidebar to start messaging" 
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center">
            <svg className="w-16 h-16 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        </div>
        <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-3">
          {title}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
    </div>
  );
};

export default EmptyState;