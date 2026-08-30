import { describe, it, expect } from "vitest";
import ErrorBoundary from "./ErrorBoundary";

describe("ErrorBoundary.getDerivedStateFromError", () => {
  it("captures the thrown error into state so the next render shows the fallback", () => {
    const error = new Error("boom");
    const nextState = ErrorBoundary.getDerivedStateFromError(error);
    expect(nextState).toEqual({ error });
  });

  it("preserves the exact error instance (not a copy or a stringified version)", () => {
    class CustomError extends Error {
      code = "CUSTOM";
    }
    const error = new CustomError("custom failure");
    const nextState = ErrorBoundary.getDerivedStateFromError(error);
    expect(nextState.error).toBe(error);
    expect((nextState.error as CustomError).code).toBe("CUSTOM");
  });
});

describe("ErrorBoundary instance behavior", () => {
  it("starts with no error in state", () => {
    const instance = new ErrorBoundary({ children: null });
    expect(instance.state).toEqual({ error: null });
  });
});
