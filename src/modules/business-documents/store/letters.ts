// Letters Store - backed by API
import { create } from 'zustand';
import { Letter } from '@/types';
import { lettersAPI } from '@/lib/api-client';

interface LettersStore {
  letters: Letter[];
  isLoading: boolean;
  isLoaded: boolean;
  fetchLetters: () => Promise<void>;
  addLetter: (letter: Omit<Letter, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Letter>;
  updateLetter: (id: string, updates: Partial<Letter>) => Promise<void>;
  deleteLetter: (id: string) => Promise<void>;
  getLetter: (id: string) => Letter | undefined;
}

export const useLettersStore = create<LettersStore>()((set, get) => ({
  letters: [],
  isLoading: false,
  isLoaded: false,

  fetchLetters: async () => {
    if (get().isLoaded) return;
    set({ isLoading: true });
    try {
      const letters = await lettersAPI.list();
      set({ letters, isLoading: false, isLoaded: true });
    } catch {
      set({ isLoading: false });
    }
  },

  addLetter: async (letterData) => {
    const newLetter = await lettersAPI.create(letterData as any);
    set((state) => ({ letters: [newLetter, ...state.letters] }));
    return newLetter;
  },

  updateLetter: async (id, updates) => {
    const current = get().letters.find(l => l.id === id);
    if (!current) return;
    const updated = await lettersAPI.update(id, { ...current, ...updates });
    set((state) => ({
      letters: state.letters.map((l) => l.id === id ? updated : l)
    }));
  },

  deleteLetter: async (id) => {
    await lettersAPI.delete(id);
    set((state) => ({
      letters: state.letters.filter((l) => l.id !== id)
    }));
  },

  getLetter: (id) => get().letters.find((letter) => letter.id === id),
}));
