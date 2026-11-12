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
- `web/site/js/auth.js` – sign-in, Proview account SSO, master login, the business dropdown and page location select, Settings → This location, Users, licence lock and per-location saving.
- `supabase/migrations/` – schema and access rules. `supabase/functions/sso-login/` – "Sign in with Proview account".

## Access model
- **Master** (`pq_masters`, `altun@proviewtech.co.uk`) has no master view here (MASTER_OPEN_SPEC.md): they open a business from the licence portal (**Open in Proview QR Menu**: sso-assert adds a signed `biz` claim, `sso-login` honours it only for the master and replies `open`). The app then works inside that one business exactly as its Owner ("Viewing <Business> as Proview" bar, Back to licence portal), kept per tab in sessionStorage `pv_master_open`. Signed in any other way the master only sees "Open a business from the licence portal"; no business data is loaded.
- **Adding a location** is done in the licence portal only (New business → hub `add_business`: one business with one location). Nobody adds, archives or moves a location in the app (migration 012, enforced by the database); renaming stays.
- **Linking locations** (migration 012): only the master, in the licence portal. The hub calls `hub_call(token, 'link', {into, from})` (business `from` merges into `into`: locations with their licences, data, guest inbox and members; a person in both keeps the higher role; owners, admins and managers get every location, staff keep theirs) and `hub_call(token, 'unlink', {account, site})` (one location out into a new business of its own, members with access copied). Owners then pick between linked locations with the location select at the top of each page. Logged in `hub_private.location_links`; safe to repeat.
 Anyone with no business and no invite can set up their own business. There are **no free trials** (migration 007): every new business and location starts with no licence, locked with the buy screen until a licence is bought (online, licence portal or 020 8935 5495). The master can still set a `trial3` by hand (inside the business: Settings → This location → Trial…).
- **Owner / Admin**: every location and feature, manage users. **Manager / Staff**: only ticked locations and features
  (feature switch missing = role default: managers everything except Users and Marketplace; staff Orders, Reservations, Guests).
- Nobody can change their own access. Writes go through security-definer functions; reads are guarded by row-level security.
- A location's data is one `pq_state` row (jsonb). Saving is refused by the database when the location's licence has ended.

## A person in several businesses, and no Locations page (12 Nov 2026)
- **Header dropdown:** business names only, by name (MULTI_BUSINESS_PICKER_STANDARD.md, OWNER UPDATE 07:47). Picking one opens it at the location used last there. One business, and the master inside the business opened from the licence portal: its name in a disabled box.
- **Location select:** every page works on one location, so when the open business has more than one, a small "Location" select sits at the top of the page. With one location it is used without asking. There is no "All locations" view.
- **Sign-in** (password, Proview account or invite) opens the business used last (`pq_last_<email>` in this browser; the location per business in `pq_site_<email>:<business>`). If it is paused, has no working licence or no location for this person, the next usable business by name opens instead (not saved over the last used). Signed out only when no business has a location for them. No "choose a business" page.
- **No Locations page:** `#locations` goes to the Dashboard. Its tools are in **Settings → This location**: the location name, the business licence with Buy licence online / Renew online (owners) or Trial… and the licence portal (the master), and the master's Pause / Delete business. Address, hours and the rest stay in Venue Information and Operating Hours.
- Tests: `node web/tests/multi_business_ui.mjs web/site` and `node web/tests/master_open_ui.mjs web/site`.

## Tables
`pq_orgs` (businesses), `pq_sites` (locations + licence), `pq_members` (logins by email: role, site_ids, features),
`pq_state` (per-location app data), `pq_masters`, `pq_trials_used`, `pq_sso_used`, `hub_private.config` (licence-portal token hash, plans).
