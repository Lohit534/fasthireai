import { create } from "zustand";

export interface UpgradeModalOptions {
  badge?: string;
  title?: string;
  description?: string;
  feature?: string;
}

interface UpgradeModalStore {
  isOpen: boolean;
  options: UpgradeModalOptions;
  openModal: (options?: UpgradeModalOptions) => void;
  closeModal: () => void;
}

export const useUpgradeModalStore = create<UpgradeModalStore>((set) => ({
  isOpen: false,
  options: {},
  openModal: (options = {}) => set({ isOpen: true, options }),
  closeModal: () => set({ isOpen: false, options: {} }),
}));
