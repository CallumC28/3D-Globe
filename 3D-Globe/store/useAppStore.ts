import { create } from "zustand";

type CameraTargetSetter = (lat: number, lon: number) => void;

type State = {
  selectedIso3: string | null;
  cameraTarget: CameraTargetSetter | null;
  setCameraTarget: (cb: CameraTargetSetter) => void;
  setSelectedIso3: (
    iso3: string,
    center?: { lat: number; lon: number }
  ) => void;
  clearSelection: () => void;
};

export const useAppStore = create<State>((set, get) => ({
  selectedIso3: null,
  cameraTarget: null,
  setCameraTarget: (cb) => set({ cameraTarget: cb }),
  setSelectedIso3: (iso3, center) => {
    set({ selectedIso3: iso3 });
    const cam = get().cameraTarget;
    if (center && cam) cam(center.lat, center.lon);
  },
  clearSelection: () => set({ selectedIso3: null })
}));
