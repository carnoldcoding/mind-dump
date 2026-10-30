/** The backend's own reason, without the method and path the client prefixes. */
export function errorText(e: unknown): string {
    if (!(e instanceof Error)) return "Network error";
    const m = /failed \(\d+\): (.+)$/.exec(e.message);
    if (m) return m[1].charAt(0).toUpperCase() + m[1].slice(1);
    return /failed \(\d+\)$/.test(e.message) ? "Server error" : "Network error";
}
