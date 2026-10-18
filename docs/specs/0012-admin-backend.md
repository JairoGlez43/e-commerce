# 0012 · Admin backend and publishing

**Status:** In Progress
**Date:** 2026-10-17
**Scope:** `docs/scope/scope.md` → feature 09
**Supersedes:** — (the demo keeps the Vercel hosting of 0001 and 0008; sold sites add
Cloudflare Pages, see Decision)

## Context
Features 10–15 (the "Autónomo" admin) all need somewhere online to keep the catalog, the
photos and the owner's login, and a way for a published change to reach the static public
site. Research on 2026-10-17 also found that Vercel's free Hobby plan forbids commercial use,
which includes being paid to build or host a site. So sites that are sold need a different
host from the demo.

## Decision
- **One setup per shop** (owner's choice): each shop gets its own Supabase project, its own
  hosting project and its own copy of the site. Nothing is shared between shops.
- **Free plans only, until a client pays** (owner's choice). The demo uses a new Supabase
  project on the owner's existing Free organization (the second of the 2 free active projects
  allowed). Any paid plan is chosen and paid by the client.
- **Backend = Supabase** (owner's preference, scope note): Postgres for products and
  categories, Storage for photos, Auth for the shop owner's admin login, and Edge Functions
  for the one action that needs a secret (publishing).
- **Two hosts, one design** (owner's choice):
  - **The demo stays on Vercel**, unchanged (specs 0001, 0008): same URL, same Git
    integration. Its publish path uses a Vercel deploy hook.
  - **Every sold site goes on Cloudflare Pages**: free plan, commercial use not forbidden, Git
    integration and deploy hooks. It is set up in the new-shop setup session, after the sale.
  - Nothing in the code depends on the host. Only `site` and the deploy hook URL differ.
- **The public site stays static** (owner's preference): it is rebuilt when the owner
  publishes, never rendered per visit. At build time Astro reads the catalog from Supabase
  (feature 10). Visitors never call Supabase.
- **Publish path:** the admin calls a Supabase Edge Function. The function checks that the
  caller is that shop's owner, then POSTs to the host's deploy hook. The hook URL is kept only
  as a Supabase secret. The host rebuilds and deploys. A failed build leaves the last good
  site live.
- **The admin is the `/admin` route of the same site:** a static page and the only route
  allowed client JS. Public pages never load it or link to it, and it is `noindex`.
- **Split account ownership** (owner's choice):
  - **Supabase account: the shop's.** Each shop gets its own Free quota, because the Free plan
    allows only 2 active projects per holder and the developer's are taken (another site and
    this demo). In one setup session the developer creates it with the shop's email, the shop
    owner reads out the verification code, and the developer joins as a member.
  - **Cloudflare account: the developer's.** It holds every sold shop's Pages project. That
    means one account and one GitHub connection. If a shop leaves, the developer transfers its
    site.
  - The shop owner never learns what Supabase or Cloudflare is. Their only login is the admin
    email and password (feature 11).
- **Custom domain per sold site** (owner's plan): bought at Hostinger and pointed at that
  shop's Pages project. The demo keeps `tienda-demo-cuba.vercel.app`.

## Acceptance criteria
- **AC1:** The demo's Vercel project has a deploy hook for `main`. A POST to it starts a
  production build that ends live. The hook URL is not in the repo, in `dist/` or in any
  build log the repo keeps.
- **AC2:** A build that fails does not change the live demo. Test: set `WHATSAPP_NUMBER` to
  `x` in the Vercel settings and fire the hook. The build fails (spec 0007) and
  `https://tienda-demo-cuba.vercel.app` still serves the previous build. Then restore the
  value and fire the hook again.
- **AC3:** A Supabase project for the demo exists on the Free plan in the owner's existing
  organization, in the region nearest Cuba that Supabase offers. It holds no tables yet.
- **AC4:** From a phone on Cuban mobile data, the owner (or someone in Cuba) loads the demo
  and sees the catalog, and gets an answer from the Supabase project's health endpoint. If
  either fails, building stops and the decision returns to `/architect`.
- **AC5:** No file in the repo changes for this feature except docs. `pnpm build` and
  `pnpm check:weight` still pass, and no public route has a `<script>` tag.

## Design

**Where everything lives (per shop)**
| Thing | Demo | Sold shop | Built by feature |
|---|---|---|---|
| Public pages | Vercel, static `dist/` (spec 0008) | Cloudflare Pages project, static `dist/` | 08 / setup session |
| Products, categories | Supabase Postgres, shape of spec 0004 | same, in the shop's project | 10 |
| Product photos | Supabase Storage, public bucket, resized at build by `astro:assets` | same | 14 |
| Owner login | Supabase Auth, one email + password user | same | 11 |
| Publish action | Edge Function + Vercel deploy hook | Edge Function + Pages deploy hook | 13 |
| Admin UI | `/admin` route of the same Astro site | same | 12 |

**Publish path**
```
owner on /admin ──(signed-in JWT)──▶ Edge Function "publish"
   checks caller == this shop's owner user ──POST──▶ deploy hook (secret; Vercel or Pages)
      host build: Astro loader reads Supabase ──▶ static dist/ ──▶ live
      build fails ──▶ previous deployment stays live (AC2)
```
Many edits followed by one publish make one build (feature 13 decides the button and status).

**Admin placement rule:** `/admin` is the only route that may ship client JS. It is exempt
from the public weight budget, and `check-weight.mjs` keeps measuring every other route
against spec 0001 unchanged. Its own size limit is decided with feature 12, which measures
the real size of the Supabase client (the research could not confirm it).

**Secrets and config**
| Value | Secret? | Where it lives |
|---|---|---|
| `WHATSAPP_NUMBER` | no | host env var (Vercel or Pages), plus `.env` locally (spec 0007) |
| Supabase project URL, anon key | no, public by design (RLS protects data) | host env vars + `.env` (named in feature 10) |
| Deploy hook URL | **yes**: anyone holding it can redeploy the site | Supabase Edge Function secret only |
| Supabase service-role key | **yes** | never in the site, repo or host |

**Security baseline** (each feature's spec details it): Row Level Security on every table.
Anonymous visitors only read the published catalog, and only the shop's owner user writes.
Storage uploads are limited to that user. The Edge Function rejects every caller except the
owner user, because a valid sign-in alone only proves that someone is signed in.

**Monthly running cost per sold shop** (prices seen 2026-10-17)
| Path | Supabase | Hosting | Per shop | Catch |
|---|---|---|---|---|
| Free (default) | Free plan, $0 | Cloudflare Pages Free, $0 | **$0** | The project pauses after 7 days without activity. Admin and publish stop until someone restores it from the dashboard, but the public site keeps working. 2 active free projects per account. |
| Paid by client | Pro, $25/month (one project included) | Pages Free, $0 | **~$25** | None of the above. |

A sold site adds its Hostinger domain, a yearly fee that was not researched. Check the price
before quoting a client. The demo costs $0: Vercel Hobby plus the developer's Free Supabase
project.

Free-plan limits that matter: 500 MB database, 1 GB storage, 5 GB egress, 500k Edge Function
calls. Pages allows 500 builds a month, and a Vercel deploy hook 60 triggers an hour. The auth
email sender is capped at 2 emails an hour, which is enough for one owner's password
recovery (custom SMTP is out of scope).

**Who holds what**
| Account | Holder | Holds |
|---|---|---|
| GitHub | developer | this repo (demo), plus one repo per sold shop |
| Vercel | developer | the demo only |
| Cloudflare | developer | one Pages project per sold shop, plus its deploy hook |
| Supabase | developer for the demo, **the shop** for a sold site | one Free project each; the developer is a member of the shop's |
| Domain (Hostinger) | decided per sale | that shop's domain, pointed at its Pages project |

**New-shop setup session** (after a sale; developer + shop owner, about 20 min, done once)
1. Create a Supabase account with the shop's email. The owner reads out the verification
   code.
2. Invite the developer's own Supabase account as a member, with the role that does not use
   up the developer's own Free quota (see notes below). From then on the developer works from
   their own login.
3. Create the shop's Supabase project (Free plan, region nearest Cuba).
4. In the developer's accounts, create the shop's repo copy, its Pages project with its env
   vars and `site` set to the shop's domain, and its deploy hook. Store the hook as that
   shop's Edge Function secret. Attach the Hostinger domain.
5. Create the owner's admin user (feature 11) and hand the owner only the `/admin` link, the
   email and how to set a password.

**Before the first sale, confirm** (with `researcher`, asking the owner first):
- **Supabase Free quota and membership:** whether the "2 active Free projects" limit counts
  every organization where the developer is Owner or Administrator. If it does, which
  member role lets the developer build and run the project without using up that quota.
- **Hostinger domain on Pages:** how to attach it. Cloudflare may require moving the domain's
  nameservers to Cloudflare for the bare domain (no `www`), and that is a free Cloudflare zone
  in the developer's account.
- Whether new static projects should use Pages or "Workers static assets".
- Node and pnpm 10 versions on the Pages build image (`packageManager` field, Node ≥ 22.12).
- That Pages builds run in UTC (`src/lib/date.ts` assumes a UTC build machine).
- That a failed Pages build leaves the last deploy live (repeat AC2 on Pages).

## Build plan
- [ ] **T1** (AC3) Owner creates the Supabase demo project, guided step by step. No tables.
- [ ] **T2** (AC1, AC2) Owner creates the Vercel deploy hook and stores the URL privately
  (it moves into the Edge Function secret in feature 13). Fire it once for a good build,
  then run the failing-build test and restore.
- [ ] **T3** (AC4) Confirm the Supabase health endpoint URL (`researcher`, ask first). Then run
  the Cuba reachability check from a phone on mobile data.
- [x] **T4** (AC5) `pnpm build` + `pnpm check:weight` on the unchanged repo.

## Out of scope
- Tables, the build-time loader and the sample data upload (feature 10). Login (11), admin
  screens (12), the publish button and its status (13), photo upload (14), categories (15).
- Setting up Cloudflare Pages and the Hostinger domain. That happens in the first sale's
  setup session, after the checks above. The scope does not list it yet.
- Custom SMTP, paid plans, backups beyond what the Free plan includes.
- A shared multi-shop admin. Moving to one would need a new spec.
- Legal advice on US sanctions (see Risks).

## Sources
- `docs/scope/scope.md` → feature 09 (done-when list, owner's notes); specs 0001, 0004, 0007,
  0008.
- Owner answers, 2026-10-17:
  - one setup per shop, on free plans until a client pays (Supabase Free, second project);
  - each shop's Supabase account is the shop's, created by the developer in a setup session;
  - every sold site hosted in the developer's own Cloudflare account, with a Hostinger custom
    domain per sold site;
  - the demo stays on Vercel, and Cloudflare is used once a site is bought.
- `researcher`, 2026-10-17 (fetch tool summaries, not verbatim except quotes):
  - Supabase: supabase.com/pricing, /terms (§14(h)), /aup; docs going-into-prod (auth email
    limit), functions/limits, functions/auth, storage access-control, storage
    image-transformations.
  - Vercel: vercel.com/docs/limits/fair-use-guidelines, /docs/plans/hobby, /legal/terms (§4,
    §14.1), /docs/deploy-hooks, /docs/limits, /pricing.
  - Cloudflare: developers.cloudflare.com/pages/platform/limits,
    /pages/configuration/deploy-hooks, cloudflare.com/terms (§7.1).
  - GitHub: docs.github.com …/github-and-trade-controls.
- Not confirmed: how a paused Supabase project's API behaves, the size of supabase-js,
  Pages vs Workers for new projects, and "a failed build keeps the last deploy" on Vercel
  (AC2 tests it) and on Pages.

---
## Rationale
<!-- History, not build input. /develop does not read below this line. -->
**Options considered:**
- One setup per shop (chosen, owner) vs one shared multi-tenant admin (runner-up: one $25
  Pro project for all shops, but every table and policy must separate shops, and one
  mistake leaks one shop's data to another).
- Sold sites on Cloudflare Pages (chosen, owner) vs Vercel Pro (rejected: $20/month from the
  first client, and the owner wants $0 until a client pays) vs Vercel Hobby (rejected:
  against its terms once a site is sold, risking account suspension).
- Demo stays on Vercel (chosen, owner) vs moving the demo to Pages now (runner-up: one host to
  learn, but it changes the demo URL that prospects already have, and the owner prefers to
  move only when a site is sold).
- Static rebuild on publish (chosen) vs rendering per visit (rejected: it breaks the weight
  goal and the "keeps working when the backend is down" goal, and the owner prefers static).
- Edge Function holds the hook (chosen) vs calling the hook from the admin page (rejected:
  the secret URL would be readable by anyone who opens `/admin`).
- Admin inside the same site (chosen) vs a separate admin app (runner-up: clean split, but a
  second project per shop to set up and host).
- Supabase account per shop, owned by the shop (chosen, owner) vs all projects in the
  developer's account (rejected: the developer's 2 Free projects are already used).
- Cloudflare in the developer's account (chosen, owner) vs one Cloudflare account per shop
  (runner-up: the shop holds its site outright, but two accounts per shop and an unconfirmed
  link from a shop's Cloudflare to the developer's GitHub).

**Assumptions and risks:**
- **Demo on Vercel Hobby** (accepted by the owner): a demo shown to win clients is arguably
  "commercial" under Vercel's fair-use definition. The risk is a suspended demo, not a
  client's site.
- **Sanctions:** Supabase (§14(h)), Cloudflare (§7.1) and Vercel (§14.1) require compliance
  with US export and sanctions law but name no country. GitHub states it is available to
  developers in Cuba. Whether a shop in Cuba may hold these accounts is a legal question,
  not answered here. The research also mentioned a new Cuba sanctions program in 2026 that
  it could not verify. AC4 tests reachability only, not legality.
- **Free-plan pause:** a shop that does not open the admin for a week finds it broken until
  the developer restores the project. This is acceptable for the demo. Each client chooses
  Pro or accepts it.
- Price and limit figures change; recheck them before quoting a client.
