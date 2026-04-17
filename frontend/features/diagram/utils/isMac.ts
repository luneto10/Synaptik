/** Static platform flag — evaluated once at module load. SSR-safe. */
export const IS_MAC =
    typeof navigator !== "undefined" &&
    /mac|iphone|ipad|ipod/i.test(navigator.userAgent);
