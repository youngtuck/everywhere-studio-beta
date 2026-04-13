import { Component, ErrorInfo, ReactNode } from "react";

/** Catches React tree errors and shows a fallback UI instead of a blank screen. */

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error?.message || error, errorInfo?.componentStack || "");
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "var(--bg-primary, #0a0a0a)",
            color: "var(--text-primary, #fff)",
            fontFamily: "'Afacad Flux', system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "var(--gold-dark, #C8961A)",
              marginBottom: 24,
            }}
          >
            EVERYWHERE Studio
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: 14,
              opacity: 0.7,
              marginBottom: 28,
              maxWidth: 380,
              lineHeight: 1.6,
            }}
          >
            This usually resolves itself. Try refreshing.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 28px",
              fontSize: 14,
              fontWeight: 600,
              background: "var(--gold-dark, #C8961A)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "'Afacad Flux', system-ui, sans-serif",
              transition: "opacity 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.88";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            Refresh
          </button>
          <p
            style={{
              fontSize: 12,
              opacity: 0.4,
              marginTop: 32,
              maxWidth: 300,
            }}
          >
            If this keeps happening, contact support.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
