# Proview QR Menu

Digital QR menus, ordering, guests and AI marketing for restaurants: the back office, in the Proview Tech theme.
Part of the Proview resold apps (Bookings, Employee, Signage, Label, WiFi) and follows the same access model.

- **Live:** https://qrmenu.proviewcrm.co.uk (GitHub Pages from `web/site`, deployed by `.github/workflows/pages.yml`).
  DNS (GoDaddy): `qrmenu CNAME proview92.github.io`.
- **Supabase:** project `proview-qrmenu`, ref `yblafwttmqaqvfvedaoc`, eu-west-2 (London).
- **Licences:** one per location, managed at https://license.proviewcrm.co.uk (product `qrmenu`, Stripe ref prefix `pvq__<location id>__<plan>`).

## Layout
- `web/site/index.html` – loads the modules below.
- `web/site/js/core.js` – UI kit, shell, router, actions. `data.js` – blank location template (+ demo data).
- `web/site/js/pages-*.js` – the app's pages (menus & editor, AI tools, orders/guests/reports, marketplace & settings).
- `web/site/js/auth.js` – sign-in, Proview account SSO, master login, Locations, location dropdown, Users, licence lock and per-location saving.
- `supabase/migrations/` – schema and access rules. `supabase/functions/sso-login/` – "Sign in with Proview account".

## Access model
- **Master** (`pq_masters`, `altun@proviewtech.co.uk`) has no master view here (MASTER_OPEN_SPEC.md): they open a location from the licence portal (**Open in Proview QR Menu**: sso-assert adds a signed `biz` claim, `sso-login` honours it only for the master and replies `open`). The app then works inside that one business exactly as its Owner ("Viewing <Business> as Proview" bar, Back to licence portal), kept per tab in sessionStorage `pv_master_open`. Signed in any other way the master only sees "Open a location from the licence portal"; no business data is loaded.
- **Adding a location** is done in the licence portal only (New location → hub `add_business`: one business with one location). Nobody adds, archives or moves a location in the app (migration 012, enforced by the database); renaming stays.
- **Linking locations** (migration 012): only the master, in the licence portal. The hub calls `hub_call(token, 'link', {into, from})` (business `from` merges into `into`: locations with their licences, data, guest inbox and members; a person in both keeps the higher role; owners, admins and managers get every location, staff keep theirs) and `hub_call(token, 'unlink', {account, site})` (one location out into a new business of its own, members with access copied). Owners then switch between linked locations with the location dropdown. Logged in `hub_private.location_links`; safe to repeat.
 Anyone with no business and no invite can set up their own business. There are **no free trials** (migration 007): every new business and location starts with no licence, locked with the buy screen until a licence is bought (online, licence portal or 020 8935 5495). The master can still set a `trial3` by hand (inside the business: Locations → Trial…).
- **Owner / Admin**: every location and feature, manage users. **Manager / Staff**: only ticked locations and features
  (feature switch missing = role default: managers everything except Users and Marketplace; staff Orders, Reservations, Guests).
- Nobody can change their own access. Writes go through security-definer functions; reads are guarded by row-level security.
- A location's data is one `pq_state` row (jsonb). Saving is refused by the database when the location's licence has ended.

## Tables
`pq_orgs` (businesses), `pq_sites` (locations + licence), `pq_members` (logins by email: role, site_ids, features),
`pq_state` (per-location app data), `pq_masters`, `pq_trials_used`, `pq_sso_used`, `hub_private.config` (licence-portal token hash, plans).
