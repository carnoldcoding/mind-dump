// Single seam to the mind-dump-backend Express API. Every request the app
// makes — URL construction, JSON parsing, error shape — goes through here
// instead of being rebuilt at each call site.
import config from "../config";
import type { AudioTrack } from "../types";

type Params = Record<string, string | undefined>;

/**
 * One candidate from a metadata provider, already mapped onto the fields a
 * Review carries — the backend translates each provider's vocabulary, so
 * nothing here knows IGDB from TMDB.
 */
export type MetadataCandidate = {
    sourceId: string | null;
    title: string | null;
    /** Canonical ISO, or a bare year where that is all the source knows. */
    release_date: string | null;
    creator: string | null;
    genres: string[];
    platforms: string[];
    description: string | null;
    /** The provider's own URL — not ours until a cover is stored. */
    image: string | null;
};

function buildUrl(path: string, params?: Params, base: string = config.apiUri): string {
    const url = new URL(path, base);
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined) url.searchParams.set(key, value);
        }
    }
    return url.toString();
}

async function request<T>(
    path: string,
    init: RequestInit & { params?: Params; base?: string } = {}
): Promise<T> {
    const { params, base, headers, ...rest } = init;
    const finalHeaders: Record<string, string> = { ...(headers as Record<string, string> | undefined) };
    if (rest.body && !finalHeaders["Content-Type"]) finalHeaders["Content-Type"] = "application/json";

    const res = await fetch(buildUrl(path, params, base), { ...rest, headers: finalHeaders });
    if (!res.ok) throw new Error(`${rest.method ?? "GET"} ${path} failed (${res.status})`);
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}

// Gated routes (everything but public reads) are nginx-gated to the
// Tailscale tailnet, so they go through the server's tailnet-only hostname
// instead of the public one — see config.ts / ADR-0001.
const gated = { base: config.trustedApiUri };

export const backend = {
    // ── Trusted device ───────────────────────────────────────────────
    probeTrustedDevice: () =>
        fetch(buildUrl("/api/system/probe", undefined, config.trustedApiUri)).then(res => res.ok),

    // ── Reviews ───────────────────────────────────────────────────────
    getReviews: (params?: { type?: string; slug?: string; title?: string }) =>
        request<any[]>("/api/posts", { params }),
    getCreators: (type: string) => request<string[]>("/api/posts/get_creators", { params: { type } }),
    saveReview: (payload: Record<string, unknown>, isUpdate: boolean) =>
        request<any>(isUpdate ? "/api/posts/update_post" : "/api/posts/add_post", {
            ...gated,
            method: "POST",
            body: JSON.stringify(payload),
        }),
    deleteReview: (slug: string) =>
        request<any>("/api/posts/remove_post", { ...gated, method: "POST", body: JSON.stringify({ slug }) }),

    // ── Metadata lookup ───────────────────────────────────────────────
    // Gated: these spend quota against third-party APIs and write to our own
    // storage, so nothing public reaches them.
    searchMetadata: (type: string, query: string) =>
        request<{ results: MetadataCandidate[] }>("/api/metadata/search", {
            ...gated,
            params: { type, q: query },
        }),
    // The full record for one chosen candidate. IGDB and TMDB return thin
    // search results — no developers, no director, no genre names — so this is
    // where most of what a lookup is for actually arrives.
    metadataDetails: (type: string, id: string) =>
        request<{ result: MetadataCandidate | null }>("/api/metadata/details", {
            ...gated,
            params: { type, id },
        }),
    /** Copies a provider's cover onto our own storage, returning our URL. */
    storeCover: (url: string) =>
        request<{ url: string }>("/api/metadata/cover", {
            ...gated,
            method: "POST",
            body: JSON.stringify({ url }),
        }),

    // ── Body tracking ─────────────────────────────────────────────────
    getBodyEntries: () => request<any[]>("/api/body", gated),
    addBodyEntry: (payload: Record<string, unknown>) =>
        request<any>("/api/body/add_entry", { ...gated, method: "POST", body: JSON.stringify(payload) }),
    updateBodyEntry: (payload: Record<string, unknown>) =>
        request<any>("/api/body/update_entry", { ...gated, method: "POST", body: JSON.stringify(payload) }),
    removeBodyEntry: (id: string) =>
        request<any>("/api/body/remove_entry", { ...gated, method: "POST", body: JSON.stringify({ id }) }),

    // ── Audio ─────────────────────────────────────────────────────────
    getAudioTracks: (postId: string) => request<AudioTrack[]>("/api/audio", { params: { post_id: postId } }),
    deleteAudioTrack: (id: string) => request<any>(`/api/audio/${id}`, { ...gated, method: "DELETE" }),

    // ── Images ────────────────────────────────────────────────────────
    getImages: (postId: string, type = "screenshot") =>
        request<any[]>("/api/images", { params: { post_id: postId, type } }),
    deleteImage: (id: string) => request<any>(`/api/images/${id}`, { ...gated, method: "DELETE" }),

    // Raw URL for the XHR-based upload flows (need progress events, so they
    // can't go through fetch-based `request`). Both callers (audio/image
    // upload) are gated routes.
    uploadUrl: (path: string) => buildUrl(path, undefined, config.trustedApiUri),
};
