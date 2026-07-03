// Single seam to the mind-dump-backend Express API. Every request the app
// makes — URL construction, auth header, JSON parsing, error shape — goes
// through here instead of being rebuilt at each call site.
import config from "../config";
import type { AudioTrack } from "../types";

type Params = Record<string, string | undefined>;

function buildUrl(path: string, params?: Params): string {
    const url = new URL(path, config.apiUri);
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined) url.searchParams.set(key, value);
        }
    }
    return url.toString();
}

function authToken(): string | null {
    return localStorage.getItem("adminToken");
}

function authHeader(): Record<string, string> {
    const token = authToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
    path: string,
    init: RequestInit & { params?: Params; auth?: boolean } = {}
): Promise<T> {
    const { params, auth, headers, ...rest } = init;
    const finalHeaders: Record<string, string> = { ...(headers as Record<string, string> | undefined) };
    if (rest.body && !finalHeaders["Content-Type"]) finalHeaders["Content-Type"] = "application/json";
    if (auth) Object.assign(finalHeaders, authHeader());

    const res = await fetch(buildUrl(path, params), { ...rest, headers: finalHeaders });
    if (!res.ok) throw new Error(`${rest.method ?? "GET"} ${path} failed (${res.status})`);
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}

export const backend = {
    // ── Auth ──────────────────────────────────────────────────────────
    verifyToken: (token: string) =>
        request<void>("/api/auth/verify", { headers: { Authorization: `Bearer ${token}` } }),
    login: (password: string) =>
        request<{ token: string }>("/api/auth/login", { method: "POST", body: JSON.stringify({ password }) }),

    // ── Reviews ───────────────────────────────────────────────────────
    getReviews: (params?: { type?: string; slug?: string; title?: string }) =>
        request<any[]>("/api/posts", { params }),
    getCreators: (type: string) => request<string[]>("/api/posts/get_creators", { params: { type } }),
    saveReview: (payload: Record<string, unknown>, isUpdate: boolean) =>
        request<any>(isUpdate ? "/api/posts/update_post" : "/api/posts/add_post", {
            method: "POST",
            body: JSON.stringify(payload),
        }),
    deleteReview: (slug: string) =>
        request<any>("/api/posts/remove_post", { method: "POST", body: JSON.stringify({ slug }) }),

    // ── Body tracking ─────────────────────────────────────────────────
    getBodyEntries: () => request<any[]>("/api/body"),
    addBodyEntry: (payload: Record<string, unknown>) =>
        request<any>("/api/body/add_entry", { method: "POST", body: JSON.stringify(payload) }),
    updateBodyEntry: (payload: Record<string, unknown>) =>
        request<any>("/api/body/update_entry", { method: "POST", body: JSON.stringify(payload) }),
    removeBodyEntry: (id: string) =>
        request<any>("/api/body/remove_entry", { method: "POST", body: JSON.stringify({ id }) }),

    // ── Audio ─────────────────────────────────────────────────────────
    getAudioTracks: (postId: string) => request<AudioTrack[]>("/api/audio", { params: { post_id: postId } }),
    deleteAudioTrack: (id: string) => request<any>(`/api/audio/${id}`, { method: "DELETE", auth: true }),

    // ── Images ────────────────────────────────────────────────────────
    getImages: (postId: string, type = "screenshot") =>
        request<any[]>("/api/images", { params: { post_id: postId, type } }),
    deleteImage: (id: string) => request<any>(`/api/images/${id}`, { method: "DELETE", auth: true }),

    // Raw URL + token for the XHR-based upload flows (need progress events,
    // so they can't go through fetch-based `request`).
    uploadUrl: (path: string) => buildUrl(path),
    authToken,
};
