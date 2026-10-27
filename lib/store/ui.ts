import { create } from 'zustand';
// Поиск по меню (не сохраняется между визитами)
export const useUI = create<{ query: string; searchOpen: boolean; setQuery: (q: string) => void; setSearchOpen: (v: boolean) => void }>((set) => ({
  query: '', searchOpen: false, setQuery: (query) => set({ query }), setSearchOpen: (searchOpen) => set({ searchOpen }),
}));
