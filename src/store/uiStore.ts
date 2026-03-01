// src/store/uiStore.ts
// For in-app toast messages only — NOT related to Firebase ART alerts
import { create } from 'zustand';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface UIState {
  toasts: Toast[];
  showToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],

  showToast: (message, type) => set((state) => ({
    toasts: [...state.toasts, { id: Date.now(), message, type }],
  })),

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
}));