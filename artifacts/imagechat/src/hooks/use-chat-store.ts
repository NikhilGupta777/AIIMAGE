import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage } from '@workspace/api-client-react';
import { get, set, del } from 'idb-keyval';

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

interface ChatStore {
  isHydrated: boolean;
  conversations: Conversation[];
  currentConversationId: string | null;

  createConversation: () => string;
  getOrCreateEmptyConversation: () => string;
  setCurrentConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  updateConversationTitle: (id: string, title: string) => void;
  clearHistory: () => void;
}

const idbStorage = {
  getItem: async (name: string) => {
    const value = await get<unknown>(name);
    return (value as Parameters<typeof idbStorage.setItem>[1]) ?? null;
  },
  setItem: async (name: string, value: { state: Partial<ChatStore>; version?: number }) => {
    await set(name, value);
  },
  removeItem: async (name: string) => {
    await del(name);
  },
};

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      isHydrated: false,
      conversations: [],
      currentConversationId: null,

      createConversation: () => {
        const id = uuidv4();
        const newConv: Conversation = {
          id,
          title: 'New Conversation',
          messages: [],
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          conversations: [newConv, ...state.conversations],
          currentConversationId: id,
        }));
        return id;
      },

      getOrCreateEmptyConversation: () => {
        const state = get();
        const current = state.conversations.find(c => c.id === state.currentConversationId);
        if (current && current.messages.length === 0) {
          return current.id;
        }
        const existingEmpty = state.conversations.find(c => c.messages.length === 0);
        if (existingEmpty) {
          set({ currentConversationId: existingEmpty.id });
          return existingEmpty.id;
        }
        const id = uuidv4();
        const newConv: Conversation = {
          id,
          title: 'New Conversation',
          messages: [],
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({
          conversations: [newConv, ...s.conversations],
          currentConversationId: id,
        }));
        return id;
      },

      setCurrentConversation: (id) => {
        set({ currentConversationId: id });
      },

      deleteConversation: (id) => {
        set((state) => {
          const newConversations = state.conversations.filter(c => c.id !== id);
          const newCurrentId =
            state.currentConversationId === id
              ? (newConversations[0]?.id || null)
              : state.currentConversationId;
          return { conversations: newConversations, currentConversationId: newCurrentId };
        });
      },

      addMessage: (conversationId, message) => {
        set((state) => {
          const convIndex = state.conversations.findIndex(c => c.id === conversationId);
          if (convIndex === -1) return state;

          const conv = state.conversations[convIndex];
          let title = conv.title;

          if (conv.messages.length === 0 && message.role === 'user') {
            if (message.type === 'text') {
              title = message.content.slice(0, 40) + (message.content.length > 40 ? '...' : '');
            } else if (message.type === 'image') {
              title = '🎨 ' + message.content.slice(0, 36);
            }
          }

          const updatedConv = {
            ...conv,
            title,
            messages: [...conv.messages, message],
            updatedAt: new Date().toISOString(),
          };

          const newConversations = [...state.conversations];
          newConversations[convIndex] = updatedConv;
          newConversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

          return { conversations: newConversations };
        });
      },

      updateConversationTitle: (id, title) => {
        set((state) => ({
          conversations: state.conversations.map(c => c.id === id ? { ...c, title } : c),
        }));
      },

      clearHistory: () => {
        set({ conversations: [], currentConversationId: null });
      },
    }),
    {
      name: 'gemini-studio-storage-v3',
      storage: idbStorage,
      partialize: (state) => ({
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.error('Failed to rehydrate chat store:', error);
        useChatStore.setState({ isHydrated: true });
      },
    }
  )
);
