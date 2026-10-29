import { create } from 'zustand';
// Поиск по меню (не сохраняется между визитами)
export const useUI = create<{ query: string; searchOpen: boolean; menuOpen: boolean; setQuery: (q: string) => void; setSearchOpen: (v: boolean) => void; setMenuOpen: (v: boolean) => void }>((set) => ({
  query: '', searchOpen: false, menuOpen: false, setQuery: (query) => set({ query }), setSearchOpen: (searchOpen) => set({ searchOpen }), setMenuOpen: (menuOpen) => set({ menuOpen }),
}));
