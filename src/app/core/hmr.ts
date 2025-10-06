export type HotModule = {
  dispose(callback: () => void): void;
};

export function registerHotDispose(hot: unknown, callback: () => void): void {
  if (!hot || typeof hot !== "object") {
    return;
  }

  const candidate = hot as Partial<HotModule>;
  if (typeof candidate.dispose === "function") {
    candidate.dispose(callback);
  }
}
