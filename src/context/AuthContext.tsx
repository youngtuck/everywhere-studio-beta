import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export type ProfileOnboarding = {
  voice_dna_completed: boolean;
  onboarding_complete: boolean;
} | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: ProfileOnboarding;
  profileLoaded: boolean;
  displayName: string;
  userTimezone: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

function titleCase(str: string): string {
  return str.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function resolveDisplayName(user: User | null, dbFullName: string | null): string {
  if (dbFullName) return dbFullName;
  const meta = user?.user_metadata;
  if (meta?.full_name) return String(meta.full_name);
  if (meta?.name) return String(meta.name);
  if (user?.email) {
    const local = user.email.split("@")[0];
    return titleCase(local.replace(/[._]/g, " "));
  }
  return "there";
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  profileLoaded: false,
  displayName: "",
  userTimezone: null,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileOnboarding>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [userTimezone, setUserTimezone] = useState<string | null>(null);
  const hasRoutedRef = useRef(false);
  const nameFixedRef = useRef(false);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("voice_dna_completed, onboarding_complete, full_name, timezone")
      .eq("id", user.id)
      .single();

    setProfile(
      data
        ? {
            voice_dna_completed: !!data.voice_dna_completed,
            onboarding_complete: !!data.onboarding_complete,
          }
        : null
    );
    setProfileLoaded(true);
    setUserTimezone(typeof data?.timezone === "string" && data.timezone.trim() ? data.timezone : null);

    // Resolve display name with fallback chain
    const resolved = resolveDisplayName(user, data?.full_name ?? null);
    setDisplayName(resolved);

    // Auto-save name to profiles if it was resolved from auth metadata but missing in DB
    if (!data?.full_name && resolved && resolved !== "there" && !nameFixedRef.current) {
      nameFixedRef.current = true;
      supabase.from("profiles").update({ full_name: resolved }).eq("id", user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_IN" && session?.user && !hasRoutedRef.current) {
        const pathname = window.location.pathname;
        const retrainParam = new URLSearchParams(window.location.search).get("retrain");
        if (retrainParam && pathname === "/onboarding") {
          return;
        }
        hasRoutedRef.current = true;
        if (pathname === "/auth") {
          (async () => {
            const { data } = await supabase
              .from("profiles")
              .select("voice_dna_completed, onboarding_complete")
              .eq("id", session.user.id)
              .single();

            if (!data?.voice_dna_completed && !data?.onboarding_complete) {
              window.location.href = "/onboarding";
            } else {
              window.location.href = "/studio/dashboard";
            }
          })();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoaded(false);
      setDisplayName("");
      setUserTimezone(null);
      nameFixedRef.current = false;
      return;
    }
    setProfileLoaded(false);
    // Set immediate display name from auth metadata while profile loads
    setDisplayName(resolveDisplayName(user, null));
    refreshProfile();
  }, [user?.id, refreshProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    hasRoutedRef.current = false;
    nameFixedRef.current = false;
    setProfile(null);
    setProfileLoaded(false);
    setDisplayName("");
    setUserTimezone(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, profileLoaded, displayName, userTimezone, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
