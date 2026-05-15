// components/chat/ChatDetailsModal.tsx
'use client';

import { useState } from 'react';
import { X, Users, UserPlus, Settings, Bell, BellOff, Pin, Search, FileText, Calendar, User, Shield, AlertCircle } from 'lucide-react';

interface ChatDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: {
    id: string;
    name: string;
    type: 'direct' | 'group';
    participants: Array<{
      id: number;
      name: string;
      avatar?: string;
      role: string;
      status: 'online' | 'offline' | 'away';
      lastActive?: string;
    }>;
    createdAt: string;
    description?: string;
    isPinned?: boolean;
    notifications?: 'all' | 'mentions' | 'none';
  };
  currentUserId: number;
}

export default function ChatDetailsModal({ isOpen, onClose, conversation, currentUserId }: ChatDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'members' | 'files' | 'settings'>('details');
  const [notifications, setNotifications] = useState(conversation.notifications || 'all');
  const [isPinned, setIsPinned] = useState(conversation.isPinned || false);

  if (!isOpen) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'En ligne';
      case 'away': return 'Absent';
      default: return 'Hors ligne';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />
      
      {/* Modal style Slack - slide from right */}
      <div className="relative w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl animate-slideInRight overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Détails de la conversation
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conversation Info */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {conversation.type === 'group' ? (
                <Users size={32} />
              ) : (
                conversation.participants.find(p => p.id !== currentUserId)?.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{conversation.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {conversation.type === 'group' 
                  ? `${conversation.participants.length} membres`
                  : `Conversation privée`}
              </p>
            </div>
          </div>
          {conversation.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {conversation.description}
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Créée le {new Date(conversation.createdAt).toLocaleDateString('fr-FR')}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {[
            { id: 'details', label: 'Détails', icon: <FileText size={18} /> },
            { id: 'members', label: 'Membres', icon: <Users size={18} /> },
            { id: 'files', label: 'Fichiers', icon: <Search size={18} /> },
            { id: 'settings', label: 'Paramètres', icon: <Settings size={18} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Actions */}
              <div className="space-y-2">
                <button 
                  onClick={() => setIsPinned(!isPinned)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Pin size={20} className={isPinned ? 'text-blue-500' : 'text-gray-400'} />
                  <span className="flex-1 text-left text-gray-700 dark:text-gray-300">
                    {isPinned ? 'Épinglé' : 'Épingler la conversation'}
                  </span>
                </button>
                
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <div className="flex items-center gap-3">
                    {notifications === 'none' ? <BellOff size={20} className="text-gray-400" /> : <Bell size={20} className="text-gray-400" />}
                    <span className="text-gray-700 dark:text-gray-300">Notifications</span>
                  </div>
                  <select
                    value={notifications}
                    onChange={(e) => setNotifications(e.target.value as any)}
                    className="text-sm bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1"
                  >
                    <option value="all">Toutes</option>
                    <option value="mentions">Mentions uniquement</option>
                    <option value="none">Aucune</option>
                  </select>
                </div>
              </div>

              {/* Conversation Info */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">À propos</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Créée le {new Date(conversation.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <User size={16} className="text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {conversation.participants.length} membre{conversation.participants.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-3">
              {conversation.participants.map(participant => (
                <div key={participant.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${getStatusColor(participant.status)}`}></span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{participant.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{participant.role}</p>
                  </div>
                  {participant.status === 'online' && (
                    <span className="text-xs text-green-600 dark:text-green-400">En ligne</span>
                  )}
                  {participant.id === currentUserId && (
                    <span className="text-xs text-blue-600 dark:text-blue-400">Vous</span>
                  )}
                </div>
              ))}
              
              {conversation.type === 'group' && (
                <button className="w-full mt-4 flex items-center justify-center gap-2 p-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                  <UserPlus size={18} />
                  <span>Ajouter des membres</span>
                </button>
              )}
            </div>
          )}

          {activeTab === 'files' && (
            <div className="text-center py-12">
              <FileText size={48} className="text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Aucun fichier partagé</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Les fichiers partagés dans cette conversation apparaîtront ici
              </p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={18} className="text-red-500" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">Zone dangereuse</span>
                </div>
                <button className="w-full text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 p-2 rounded transition-colors">
                  Quitter la conversation
                </button>
                <button className="w-full text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 p-2 rounded transition-colors">
                  Supprimer la conversation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}