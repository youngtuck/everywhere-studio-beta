import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

const STORAGE_KEY = "ew-active-project-id";

export type StudioProject = {
  id: string;
  name: string;
  is_default: boolean;
};

type ProjectContextValue = {
  projects: StudioProject[];
  activeProjectId: string | null;
  setActiveProjectId: (id: string) => void;
  activeProject: StudioProject | null;
  loading: boolean;
  refreshProjects: () => Promise<void>;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user, displayName } = useAuth();
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setActiveProjectIdState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, is_default")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("sort_order");

    if (error) {
      console.error("Failed to load projects:", error.message);
    }

    if (error || !data?.length) {
      const fallback: StudioProject[] = [{
        id: "default",
        name: displayName?.split(" ")[0] ? `${displayName.split(" ")[0]}'s Studio` : "My Studio",
        is_default: true,
      }];
      setProjects(fallback);
      const stored = localStorage.getItem(STORAGE_KEY);
      const nextId = stored && fallback.some(p => p.id === stored) ? stored : fallback[0].id;
      setActiveProjectIdState(nextId);
      setLoading(false);
      return;
    }

    const list = data as StudioProject[];
    setProjects(list);

    const stored = localStorage.getItem(STORAGE_KEY);
    const validStored = stored && list.some(p => p.id === stored);
    const def = list.find(p => p.is_default);
    const next = validStored ? stored! : (def?.id ?? list[0].id);
    setActiveProjectIdState(next);
    localStorage.setItem(STORAGE_KEY, next);
    setLoading(false);
  }, [user, displayName]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const setActiveProjectId = useCallback((id: string) => {
    setActiveProjectIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const activeProject = useMemo(() => {
    if (!activeProjectId) return null;
    return projects.find(p => p.id === activeProjectId) ?? projects.find(p => p.is_default) ?? projects[0] ?? null;
  }, [projects, activeProjectId]);

  const value = useMemo<ProjectContextValue>(() => ({
    projects,
    activeProjectId,
    setActiveProjectId,
    activeProject,
    loading,
    refreshProjects: loadProjects,
  }), [projects, activeProjectId, setActiveProjectId, activeProject, loading, loadProjects]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useStudioProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useStudioProject must be used within ProjectProvider");
  return ctx;
}
