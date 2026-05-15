// components/follow/FollowModal.tsx
'use client';

import { X } from 'lucide-react';
import FollowTabs from './FollowTabs';

interface FollowModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | number;
  isCurrentUser?: boolean;
  initialTab?: 'followers' | 'following' | 'friends' | 'suggestions';
}

export default function FollowModal({ 
  isOpen, 
  onClose, 
  userId, 
  isCurrentUser = false,
  initialTab = 'followers'
}: FollowModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal centré */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-2xl transition-all">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isCurrentUser ? 'Mes relations' : 'Relations'}
              </h3>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <FollowTabs 
              userId={userId} 
              isCurrentUser={isCurrentUser}
              onClose={onClose}
              initialTab={initialTab}
            />
          </div>
        </div>
      </div>
    </div>
  );
}