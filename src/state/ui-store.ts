import { createStore } from "zustand/vanilla";

export type UiPreferences = {
  textScale: 1 | 1.15 | 1.3;
  highContrast: boolean;
  reducedMotion: boolean;
  quietMode: boolean;
  plainLanguage: boolean;
};

export type UiStoreState = UiPreferences & {
  setPreference: <Key extends keyof UiPreferences>(key: Key, value: UiPreferences[Key]) => void;
  reset: () => void;
};

const defaults: UiPreferences = {
  textScale: 1,
  highContrast: false,
  reducedMotion: false,
  quietMode: false,
  plainLanguage: false,
};

export const uiStore = createStore<UiStoreState>((set) => ({
  ...defaults,
  setPreference: (key, value) => set({ [key]: value }),
  reset: () => set(defaults),
}));
