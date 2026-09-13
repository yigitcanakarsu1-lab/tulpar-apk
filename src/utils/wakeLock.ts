let wakeLockSentinel: any = null;
let isRequested = false;

const handleVisibilityChange = async () => {
  if (isRequested && document.visibilityState === "visible" && !wakeLockSentinel) {
    try {
      if ("wakeLock" in navigator) {
        wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
        wakeLockSentinel.addEventListener("release", () => {
          wakeLockSentinel = null;
        });
      }
    } catch (err) {
      console.warn("Could not re-acquire screen wake lock on Android visibility change:", err);
    }
  }
};

/**
 * Requests the Screen Wake Lock API so the device screen does not lock/sleep.
 * Useful for hands-free "Siri / Ambient" assistant dock mode on Android & iOS.
 */
export async function requestScreenWakeLock(): Promise<boolean> {
  if (typeof window === "undefined" || !("wakeLock" in navigator)) {
    console.warn("Screen Wake Lock API is not supported on this browser.");
    return false;
  }

  isRequested = true;
  try {
    if (wakeLockSentinel && !wakeLockSentinel.released) {
      return true;
    }
    wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
    wakeLockSentinel.addEventListener("release", () => {
      wakeLockSentinel = null;
    });

    document.removeEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return true;
  } catch (err: any) {
    console.warn("Failed to acquire screen wake lock:", err?.message || err);
    return false;
  }
}

/**
 * Releases the Screen Wake Lock.
 */
export async function releaseScreenWakeLock(): Promise<void> {
  isRequested = false;
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch (err) {
      console.warn("Error releasing wake lock:", err);
    } finally {
      wakeLockSentinel = null;
    }
  }
}

export function isWakeLockSupported(): boolean {
  return typeof window !== "undefined" && "wakeLock" in navigator;
}
