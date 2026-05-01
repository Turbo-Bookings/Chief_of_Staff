import { create } from "zustand";

type RecordingState = "idle" | "recording" | "processing";

interface AppState {
  recordingState: RecordingState;
  setRecordingState: (state: RecordingState) => void;

  activeCaptureId: number | null;
  setActiveCaptureId: (id: number | null) => void;

  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  recordingState: "idle",
  setRecordingState: (recordingState) => set({ recordingState }),

  activeCaptureId: null,
  setActiveCaptureId: (activeCaptureId) => set({ activeCaptureId }),

  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
