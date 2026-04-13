/** PWA install prompt event (Chrome/Edge). Not in all TS libs. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface Window {
  __ewWorkStage?: string;
  __ewSetWorkStage?: (stage: string) => void;
  __ewCodeId?: string;
}
