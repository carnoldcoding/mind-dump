---
status: accepted (partial)
---

**Scope note (2026-07-06):** Only the backend-layer gate and the client-side probe/nav-hiding below have been implemented. The frontend-layer nginx gate and the Cloudflare Pages → home-box migration ("Migration plan" section below) were deliberately deferred — the backend is the real security boundary (all sensitive reads/writes live there), so gating it is sufficient on its own. The `/system` nav item is hidden by default and only renders once the client-side probe succeeds, so an untrusted visitor never sees it; even a direct guess at the URL renders a shell that can't reach any data, since the backend still rejects every non-tailnet request. The migration plan is left below as a possible future step, not a current commitment.

# Trust is network identity (Tailscale), not a login portal

`System` (Review authoring + Body tracking) was gated by a single shared admin password producing a JWT stored in `localStorage` — but that JWT was only ever checked by the frontend and by `audio`/`images` upload/delete routes. `posts` writes and all of `body`/`soul` (the Journal data) had **no server-side auth at all**, password or otherwise: anyone with the API URL could read/write them directly.

We decided to drop credential-based auth entirely and gate on network identity instead: enroll specific devices (phone, computer) into a Tailscale tailnet, and have nginx allow/deny by source IP (Tailscale's `100.64.0.0/10` CGNAT range) in front of every route that isn't a genuinely public Review read. This applies at three layers:

- **Backend**: nginx allow/deny in front of all `posts` writes, all of `body`/`soul`, and audio/image upload+delete. Only `GET /api/posts`, `/get_genres`, `/get_creators`, and read-only audio/images stay open to the public internet. This is the real security boundary — every sensitive read/write lives here.
- **Frontend**: nginx allow/deny in front of `/system` too, so the route 404s server-side for direct navigation/refresh from an untrusted device.
- **Client-side**: since react-router navigates `/system` without a server round-trip, the SPA also probes a tailnet-gated endpoint on mount and only renders the "system" nav item / route if that probe succeeds — closing the gap nginx's path-based block can't cover (in-app navigation after the public site is already loaded).

Considered and rejected: a long-lived device bearer token (simpler, but still internet-reachable — security by secrecy, not by absence); WebAuthn/passkeys (strong device identity, but still a visible per-visit prompt, not "just logged in"); IP allowlisting without a VPN (phone IPs roam constantly, not durable).

**Frontend hosting: migrating off Cloudflare Pages to a self-hosted origin.** Confirmed 2026-07-03: the frontend is currently on Cloudflare Pages (`syntheticsoul.me` resolves to Cloudflare's anycast IPs, `172.67.185.222`/`104.21.51.203`) — there's no server we control in front of it, so the frontend-layer nginx gate above can't be attached anywhere as-is. Briefly considered dropping that layer and relying on backend + client-side only (an untrusted visitor would get the SPA shell with no real data, since the client-side probe and backend gate both still hold) — **rejected in favor of migrating the frontend to this box** so the design matches the three layers above exactly, rather than carrying a permanent asterisk on the frontend layer. Also rejected: Cloudflare Access in front of `/system` (a second, different gating mechanism alongside Tailscale — more moving parts, likely reintroduces a credential-like prompt via email OTP or WARP enrollment).

**Open dependency, not yet resolved**: `syntheticsoul.me` / `api.syntheticsoul.me` are public hostnames. For nginx's tailnet-IP checks to ever see a tailnet-range source IP, trusted devices must actually route those hostnames over the tailnet — proposed via Tailscale Split DNS (same public hostnames, tailnet members resolve to the tailnet IP, everyone else keeps resolving publicly). Not yet confirmed with the user. Once the frontend also moves to this box, Split DNS needs to cover both hostnames, not just `api.syntheticsoul.me`.

Consequence: `ADMIN_PASSWORD`, `JWT_SECRET`, `controllers/auth.js`, `middleware/auth.js`, `AuthContext.tsx`, and the login form are all dead weight once this lands and should be deleted, not kept as a fallback.

## Migration plan: frontend off Cloudflare Pages

Current state (2026-07-03): `api.syntheticsoul.me` → `173.59.55.98` (this box's public IP, DNS-only, Certbot-managed cert, nginx site `mind_dump_api`). `syntheticsoul.me` → Cloudflare Pages. This box (`webserver`) has no passwordless `sudo`, so the nginx/Certbot steps below need to be run interactively, not scripted unattended; DNS lives in the Cloudflare dashboard, outside this box entirely.

Steps, in order:

1. **Nginx site for the frontend** — new server block for `syntheticsoul.me` (+ `www`), modeled on the existing `mind_dump_api` site: serve the built `dist/` with SPA fallback (`try_files $uri /index.html`), plus an `allow`/`deny`-by-tailnet-IP rule in front of `/system` (the frontend layer from above). Needs `sudo` to write `/etc/nginx/sites-available/` and reload nginx.
2. **TLS cert** — `certbot` for `syntheticsoul.me`, same pattern as the existing `api.syntheticsoul.me` cert. Needs DNS pointed at the box first if using the HTTP-01 challenge (or use DNS-01 to sequence it before the cutover).
3. **DNS cutover** — in the Cloudflare dashboard, change `syntheticsoul.me`'s A record from Cloudflare Pages to `173.59.55.98`, DNS-only ("grey cloud"), matching how `api.syntheticsoul.me` is set up. This is the step that actually moves live traffic — do last, after the nginx site + cert are ready to receive it.
4. **Deploy step** — decide how the built `dist/` gets onto the box (manual `scp`/copy for now vs. extending the existing `deploy.sh` / post-merge-hook pattern already used for the backend). Not yet decided.
5. **Split DNS** (still the pre-existing open dependency above) — extend to cover `syntheticsoul.me` once it's self-hosted, not just `api.syntheticsoul.me`.

Not yet started: no nginx config, cert, DNS change, or deploy mechanism exists for this yet — only this plan.
