import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Optional extra recovery action run when "Try again" is pressed, in
   * addition to clearing the boundary's own error state - e.g. navigating
   * a parent component back to a known-safe screen instead of re-mounting
   * straight back into whatever state caused the crash.
   */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches runtime errors thrown anywhere in the component tree below it and
 * renders a recoverable fallback instead of letting React unmount the whole
 * app to a blank white screen.
 *
 * Must be a class component: React only supports error boundaries via
 * getDerivedStateFromError / componentDidCatch, there is no hook equivalent.
 *
 * Scope note: this only catches errors thrown during rendering, in
 * lifecycle methods, and in constructors of the tree below it. It does NOT
 * catch errors inside event handlers (e.g. an onClick throwing), inside
 * async code (a rejected promise in a useEffect), or errors in the
 * boundary's own render. Those are expected to be handled at their own
 * call sites (e.g. useAuth/useSynthesis already surface errors as state
 * rather than throwing).
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Unhandled error caught by ErrorBoundary:", error, info.componentStack);
  }

  private handleReset = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <main className="min-h-screen bg-ink text-ink-text flex items-center justify-center px-6">
        <div className="w-full max-w-sm flex flex-col gap-6 text-center">
          <div>
            <h1 className="font-display text-3xl font-light">Something went wrong</h1>
            <p className="mt-2 text-muted-onink text-sm">
              Plumbline hit an unexpected error and had to stop. Your account and
              saved scans are untouched.
            </p>
          </div>

          <details className="reading text-left rounded-md border border-ink-line bg-ink-panel px-3 py-2 text-xs text-muted-onink">
            <summary className="cursor-pointer select-none text-muted-onink hover:text-brass-dim transition-colors">
              Technical details
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">{error.message}</pre>
          </details>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="reading rounded-full border border-brass-dim px-6 py-3 text-sm tracking-[0.15em] text-brass hover:bg-brass hover:text-ink transition-colors"
            >
              TRY AGAIN
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="reading text-xs tracking-[0.1em] text-muted-onink hover:text-brass-dim transition-colors"
            >
              RELOAD THE APP
            </button>
          </div>
        </div>
      </main>
    );
  }
}
