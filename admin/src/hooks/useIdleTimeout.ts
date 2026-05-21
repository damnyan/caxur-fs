import { useEffect, useRef, useCallback } from 'react';

/**
 * A hook that triggers a callback after a period of user inactivity.
 * @param onIdle The function to call when the user becomes idle.
 * @param idleTimeInMs The time in milliseconds before the user is considered idle.
 */
export function useIdleTimeout(onIdle: () => void, idleTimeInMs: number = 15 * 60 * 1000) {
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleActivity = useCallback(() => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    timeoutId.current = setTimeout(() => {
      onIdle();
    }, idleTimeInMs);
  }, [onIdle, idleTimeInMs]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    
    // Set initial timeout
    handleActivity();

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [handleActivity]);
}

