/// <reference types="vite/client" />

interface Window {
  wildline: {
    loadSave: () => Promise<SaveState | null>;
    save: (value: SaveState) => Promise<{ savedAt: string }>;
    close: () => Promise<void>;
  };
}

interface SaveState {
  version: 1;
  money: number;
  catchBalls?: number;
  activeBuilding?: string;
  activeFloor?: string;
  capturedCreatures: string[];
  construction: { phase: number; hired: boolean; startedAt?: string };
  minigameBest: number;
  lastSavedAt?: string;
}
