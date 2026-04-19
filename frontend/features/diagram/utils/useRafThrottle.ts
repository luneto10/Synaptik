import { useCallback, useEffect, useRef } from "react";

/**
 * Returns a function that batches rapid calls to `fn` into at most one invocation
 * per animation frame, using the *latest* arguments. Useful when a high-frequency
 * pointer event drives a state update that otherwise causes cascades of renders.
 *
 * The returned function is stable across renders; `fn` is always read via a ref.
 * On unmount any pending frame is cancelled.
 */
export function useRafThrottle<TArgs extends unknown[]>(
    fn: (...args: TArgs) => void,
): (...args: TArgs) => void {
    const fnRef = useRef(fn);
    const frameRef = useRef<number | null>(null);
    const argsRef = useRef<TArgs | null>(null);

    useEffect(() => {
        fnRef.current = fn;
    }, [fn]);

    useEffect(
        () => () => {
            if (frameRef.current != null) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
        },
        [],
    );

    return useCallback((...args: TArgs) => {
        argsRef.current = args;
        if (frameRef.current != null) return;
        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            const latest = argsRef.current;
            argsRef.current = null;
            if (latest) fnRef.current(...latest);
        });
    }, []);
}
