/// <reference types="vite/client" />

import type { SaveStateV2 } from './game/types';

declare global {
  interface Window {
    wildline: {
      loadSave: () => Promise<unknown>;
      save: (value: SaveStateV2) => Promise<{ savedAt: string }>;
      close: () => Promise<void>;
    };
  }
}

export {};
