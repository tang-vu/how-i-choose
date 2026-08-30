import { createStore } from "zustand/vanilla";

import type { WorkspaceSnapshot, WorkspaceRepository } from "@/persistence/repository";

export type AppStoreState = {
  workspace: WorkspaceSnapshot | null;
  hydration: "idle" | "loading" | "ready" | "error";
  errorCode: string | null;
  hydrate: (
    repository: WorkspaceRepository,
    ids: { profileId: string; sessionId: string; scenarioId: string },
  ) => Promise<void>;
  refresh: (
    repository: WorkspaceRepository,
    ids: { profileId: string; sessionId: string; scenarioId: string },
  ) => Promise<void>;
  clear: () => void;
};

export const appStore = createStore<AppStoreState>((set) => {
  const load = async (
    repository: WorkspaceRepository,
    ids: { profileId: string; sessionId: string; scenarioId: string },
    showLoading: boolean,
  ) => {
    if (showLoading) set({ hydration: "loading", errorCode: null });
    try {
      const workspace = await repository.readWorkspace(ids.profileId, ids.sessionId, ids.scenarioId);
      set({ workspace, hydration: "ready", errorCode: workspace ? null : "WORKSPACE_NOT_FOUND" });
    } catch {
      set({ hydration: "error", errorCode: "LOCAL_DATABASE_ERROR" });
    }
  };
  return {
    workspace: null,
    hydration: "idle",
    errorCode: null,
    hydrate: (repository, ids) => load(repository, ids, true),
    refresh: (repository, ids) => load(repository, ids, false),
    clear: () => set({ workspace: null, hydration: "idle", errorCode: null }),
  };
});
