import { createContext, useContext } from "react";

export interface ShellCtx {
  searchOpen: boolean;
  setSearchOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  dashOpen: boolean;
  setDashOpen: (v: boolean) => void;
  discoverOpen: boolean;
  setDiscoverOpen: (v: boolean) => void;
  dashContent: React.ReactNode | null;
  setDashContent: (node: React.ReactNode | null) => void;
  feedbackContent: React.ReactNode | null;
  setFeedbackContent: (node: React.ReactNode | null) => void;
  reedPrefill: string;
  setReedPrefill: (text: string) => void;
  reedChipRequest: { id: number; text: string } | null;
  setReedChipRequest: (req: { id: number; text: string } | null) => void;
  reedThread: Array<{ type: "user" | "reed" | "note"; text: string; from?: string; to?: string }>;
  setReedThread: (fn: (prev: any[]) => any[]) => void;
}

export const ShellContext = createContext<ShellCtx>({
  searchOpen: false,
  setSearchOpen: () => {},
  dashOpen: false,
  setDashOpen: () => {},
  discoverOpen: false,
  setDiscoverOpen: () => {},
  dashContent: null,
  setDashContent: () => {},
  feedbackContent: null,
  setFeedbackContent: () => {},
  reedPrefill: "",
  setReedPrefill: () => {},
  reedChipRequest: null,
  setReedChipRequest: () => {},
  reedThread: [],
  setReedThread: () => {},
});

export function useShell() {
  return useContext(ShellContext);
}
