# Valence: information for institutional reviewers

Valence is an independent, free project made for any learner. It is not affiliated with any school and there is no vendor relationship: no contract, no account manager, and no support agreement. An institution that chooses to point students to Valence does its own review. This page gives each reviewing department the facts it needs.

Each section states only what is true of the current version. Sections for accessibility services, faculty, and lab safety will be added as the features they describe are built.

## IT and security

- **What it is:** a static website (HTML, CSS, JavaScript). There is no server-side code, database, or API.
- **Install:** none. It runs in a current version of Chrome, Edge, Firefox, or Safari.
- **Accounts:** none. There is no sign-in of any kind.
- **Network:** after the page loads, the app makes no network requests. Fonts and all data are bundled; nothing is loaded from a third-party CDN.
- **Storage:** preferences and learning progress are stored in the browser's `localStorage` under keys beginning `valence:`. Nothing is stored anywhere else.
- **Shared computers:** on a shared browser profile, the next person can see the previous learner's saved progress. Settings has a "Clear my progress" button, and clearing site data in the browser has the same effect.
- **Self-hosting:** run `npm ci && npm run build`, then serve the `dist/` folder from any static web server. No rewrite rules are needed, and it works from a sub-path.
- **Source code:** public under the MIT licence.

## Legal and privacy

- **Personal data:** Valence collects none. It has no accounts, no forms that ask for personal information, no analytics, and no cookies.
- **Data leaving the device:** none. Progress never leaves the learner's browser unless the learner uses "Export my progress" to download their own file.
- **Education records:** because nothing is collected or transmitted, Valence creates and holds no records about any student. Whether and how an institution uses Valence under FERPA or similar rules is the institution's determination; this page states the facts for that review and is not legal advice.
- **Children's privacy (COPPA) and GDPR:** the same facts apply. No personal information is collected from anyone, of any age, in any location.
- **Third-party data:** chemistry data is cited to its sources on the About page.
- **Licence:** MIT.

## Finance and procurement

- **Cost:** free. There are no paid tiers.
- **Licence:** MIT, which permits use, copying, modification, and redistribution, including by institutions.
- **Contract and vendor:** none. There is no company behind Valence, no service-level agreement, and no guaranteed support.
- **Hosting cost if self-hosted:** that of serving a few megabytes of static files.
