# DOPAMINE CRM Suite Field Force CRM Blueprint

## Scope and executive diagnosis

I could directly analyze the current chat, the uploaded screenshot that references the `dopamine-crm-suite-playground` ChatGPT project, and public documentation about life-sciences CRM and PWA engineering. I could not directly open every hidden conversation inside the private ChatGPT project from the screenshot alone, so this report treats your own brief in this conversation as the authoritative internal status: infrastructure and authentication have largely been stabilized, but the product layer is still not field-ready.

The most important strategic conclusion is this: **DOPAMINE no longer has an infrastructure problem first; it has a product-definition problem first.** Mature life-sciences CRMs center their user experience on account management, territory assignment, call planning, structured call reporting, activity timelines, offline mobile execution, and analytics. That is why your next sprint should be a **field-workflow productization sprint**, not another backend detour. citeturn11view0turn11view4turn11view7turn11view3

Your current brief already identifies the real blockers: Arabic text rendering is broken, `/account` is empty, `/visits`, `/today-route`, and `/live-map` are not credible, and the app still lacks a true pharmaceutical field workflow with customer profiles, visit lifecycle, frequency management, due/overdue logic, and reports. That combination means the system is still behaving like a prototype shell rather than a serious field-force product.

My strong executive view is simple: **do not put this in front of reps yet**. If a medical representative sees Unicode escapes, blank account pages, and decorative routes with no operational depth, they will judge the whole system as unserious. The right next move is to turn the app into a narrow, high-quality **doctor/pharmacy field CRM** and keep sales, invoicing, collections, and accounting completely out of scope.

## What a real pharmaceutical field-force CRM contains

A credible pharmaceutical CRM starts with the right account model. Established life-sciences CRMs explicitly separate **person accounts** such as doctors and other HCPs from **business accounts** such as pharmacies, hospitals, and clinics, and they attach those accounts to territories, account hierarchies, and relationship maps. Veeva’s account model, for example, is built around person accounts, business accounts, territories, and hierarchy/sphere-of-influence navigation. For DOPAMINE, this is the correct foundation: doctors and pharmacies should be first-class objects, not generic “customers.” citeturn11view0turn11view1

After master data, the next mandatory layer is **planning**. Oracle’s life-sciences planning documentation describes target lists, route plans, activities, meetings, and scheduled calls as core planning tools, while Salesforce’s life-sciences customer engagement product emphasizes offline mobile productivity for field teams and contextual profile insights before and after visits. In other words, a proper pharma CRM does not stop at a customer list; it must help reps decide **who to visit, when to visit, and why that visit matters**. citeturn11view7turn11view4

Execution must then be captured in a structured way. Industry-standard pharma CRMs treat the interaction record as a formal object with call date/time, duration, products discussed, discussion topics, and compliance-oriented completion rules. Veeva documents product detailing, product discussions, required medical discussions, call date/time capture, default duration handling, GPS check-in, GPS timestamps at key moments, and submit-time locking of the record. That means DOPAMINE should not treat a visit as a free-text note; it should treat it as a governed operational event. citeturn17search0turn17search1turn11view6turn22view1turn22view2turn22view0turn22view3

Management also needs **frequency intelligence**, not just history. Veeva’s cycle-plan and analytics documentation shows planned-versus-actual call counts, attainment metrics, and frequency details such as accounts meeting, exceeding, or falling under target, with export to Excel. That is the direct precedent for the due/overdue and monthly-frequency logic you want: a rep should know which doctors and pharmacies are still due this month, which are already covered, and which are slipping behind plan. citeturn11view2turn11view3turn19search19

Finally, a pharma field CRM should include a controlled way to capture **medical inquiries, product complaints, or adverse/safety signals** even if the full case workflow stays in another system. Veeva allows medical inquiries to be launched from the account detail page or directly from a call report, supports signatures, and handles offline submission/sync behavior. WHO defines pharmacovigilance as the detection, assessment, understanding, and prevention of adverse effects or other medicine-related problems, and Jordan’s JFDA exposes an adverse incident reporting form for hospitals, pharmacies, health-care centers, and others. For DOPAMINE, that means a rep should be able to flag a serious inquiry or product issue from the field instead of burying it inside a note. citeturn13view0turn11view9turn11view8

## The right product scope for DOPAMINE

The right target scope is a **pharmaceutical field engagement CRM**, not a mini-ERP. The core surfaces should be `/account`, `/customers`, `/customers/:id`, `/visits`, `/today-route`, `/live-map`, and `/reports`, with roles for admin and medical rep. Those routes should operationalize the account, territory, planning, call-reporting, and frequency concepts described above. citeturn11view0turn11view7turn11view3turn11view4

`/account` should become the rep’s operational profile page, not an empty placeholder. It should show identity, role, territory, assigned customer counts, today’s plan, unsynced queue count, last successful sync, geolocation permission state, app build/version, and support diagnostics. That design is justified because geolocation requires a secure context and explicit permission, and modern PWAs need visible sync and update state instead of hiding them. citeturn12view1turn20view2turn12view4turn12view6

`/customers` should be a territory-aware working list of doctors and pharmacies, with filters for customer type, territory, priority/class, specialty, assignee, due/overdue status, and last-visit recency. ` /customers/:id` should be the real customer profile: header data, account type, specialization or pharmacy classification, territory, location, activity timeline, visit history, products/topics discussed, monthly frequency target, attainment so far, pending next action, notes, attachments, and inquiry/complaint history. That is the practical translation of the account, timeline, and frequency patterns documented in established life-sciences CRMs. citeturn11view0turn5search1turn5search13turn11view2turn11view3turn13view0

`/today-route` should not be a static list. It should merge planned visits, route order, time windows, estimated travel, first priority, due/overdue badges, and quick actions such as “Start Visit,” “Open Profile,” and “Map Route.” Oracle’s life-sciences scheduling model explicitly includes target lists, routes, activities, call scheduling, start times, and duration, which is exactly the backbone a serious “today route” page needs. citeturn11view7turn19search16turn22view2

`/visits` should expose a clean lifecycle: **Planned → Started → Checked in → In Visit → Call Recorded → Ended → Submitted → Synced**. My view is that DOPAMINE should use a higher-level **Visit** object containing one or more lower-level **Call/Discussion** records. That is an inference from the call-centric models used in Veeva and Oracle, combined with your requirement for “Start Visit,” visit timer, “Start Call,” call timer, notes, and “End Visit.” A timer in the UI is useful, but the authoritative data should be timestamps and durations: check-in timestamp, call datetime, duration, submit timestamp, and locked status after submission. citeturn22view0turn22view1turn22view2turn22view3turn19search4

`/live-map` should be operational, not decorative. It should show the rep’s current route context, active visit location, nearby assigned customers, and the current visit’s location state. It should use `getCurrentPosition()` for explicit check-in/check-out events and `watchPosition()` only while a live visit is active or the rep explicitly opens tracking. MDN is clear that geolocation needs HTTPS and user permission, and `watchPosition()` is meant for position updates over time. citeturn12view1turn12view2turn12view0

`/reports` should answer the questions that reps and managers actually ask. For reps, that means plan-versus-actual visits, due today, overdue accounts, average visit duration, total time in field, completed calls, missed calls, and unsynced actions. For managers, that means coverage by territory, attainment by rep, frequency attainment by account, accounts under goal, GPS compliance, no-visit accounts, and exportable data. Veeva’s analytics already models attainment, frequency details, “my calls” versus team totals, and Excel export, so these reports are not feature creep; they are table stakes. citeturn11view3

What should **not** be in scope is just as important. DOPAMINE should hide or remove invoice, order, billing, payment, collection, and inventory-selling surfaces from this product branch. Major life-sciences platforms do contain separable modules such as order management or samples, but their own documentation shows those functions as modules distinct from core account/call execution. For your current branch, the right product is a field-force CRM, not a sales ledger. citeturn17search10turn13view0

If the repo does not already contain real doctors, pharmacies, and territories, Codex should **not** fake them as if they are production records. It should create clean CSV or XLSX import templates for HCPs, HCOs, addresses, territories, assignments, and monthly frequency plans, and mark all seed records as demo data.

## The gaps that matter most right now

The first big gap is the **domain gap**. Based on your own brief, the app still lacks a serious model for doctors versus pharmacies, territory ownership, assignment logic, monthly frequency targets, due/overdue engine, customer profile depth, and visit lifecycle. That is why pages feel shallow: the UI is being asked to look professional before the product model underneath is fully defined. The fix is not cosmetic polish alone; it is account, planning, visit, and reporting depth. citeturn11view0turn11view7turn11view3

The second gap is **Arabic product quality**. Unicode-escaped Arabic strings, weak RTL layout, and visually generic pages are not small defects in your context; they are credibility failures. W3C’s Arabic layout requirements make clear that Arabic script support on the web has specific layout and text-support requirements, MDN recommends CSS logical properties so layouts follow writing direction instead of hard-coded left/right assumptions, and web.dev warns that translated products need fonts with adequate character coverage and should avoid baking text into images. A real Arabic CRM needs a proper localization pipeline, `dir="rtl"` where appropriate, logical CSS, and Arabic-capable fonts from the start. citeturn12view9turn12view8turn12view10turn7search2

The third gap is **PWA freshness and trustworthiness**. Your own caution about stale service-worker assets is exactly right. web.dev explains that PWA asset updates need an explicit strategy, commonly using hashed asset lists and stale-while-revalidate or similar update patterns, and that browsers compare service-worker bytes to detect updates. If DOPAMINE ships visual changes without visible build/version proof and controlled cache invalidation, your team can easily be looking at old assets and arguing about the wrong build. citeturn12view6turn6search13

The fourth gap is **offline and real-device realism**. Service workers and offline storage make strong offline experiences possible, but Background Sync is not Baseline across major browsers, which means you cannot assume automatic background replay everywhere. MDN flags Background Sync as not universally available, and Workbox explicitly documents a fallback strategy that retries when the service worker starts up on browsers without native support. This is why browser simulation is not enough: real Android and iPhone/iPad tests are mandatory before field rollout. citeturn21view0turn21view1turn21view2

## Technical architecture and proof requirements

The app should move to a narrow, explicit data model. At minimum, I would define `Territory`, `UserAssignment`, `Customer`, `CustomerAddress`, `FrequencyPlan`, `RouteDay`, `Visit`, `VisitEvent`, `CallRecord`, `DiscussionTopic`, `VisitNote`, `Task`, `InquiryOrComplaint`, `Attachment`, and `SyncQueueItem`. The operational state machine should be human-readable and auditable: a visit can be planned, started, checked in, active, ended, submitted, synced, and optionally reopened only with controlled admin privilege. That design follows the structure of established life-sciences call reporting, GPS stamping, and submission locking, while adapting it to your desired Visit → Call hierarchy. citeturn11view0turn22view0turn22view1turn22view3

On the PWA side, there should be a visible and testable architecture, not invisible magic. The app should expose its manifest metadata, a human-visible build ID, a service-worker version, and a simple “update available / refresh now” flow. The manifest is the standards-based place for app metadata like name, icons, and preferred launch URL; service workers provide offline-first behavior; IndexedDB is the right persistence layer for structured client-side data and queued write operations; and Workbox can help manage asset precaching and request replay. citeturn12view7turn12view3turn12view5turn21view1turn12view6

For offline queueing, DOPAMINE should store failed POST operations in IndexedDB and replay them when connectivity returns. Where native Background Sync exists, the service worker should register sync tasks; where it does not, the queue should retry when the service worker wakes or when the app reopens. That is the robust pattern documented by MDN and Workbox. The practical implication is that every offline action needs a deterministic queue ID, status, retry count, and last-error field visible in support diagnostics. citeturn21view0turn21view1turn21view2turn12view5

For authentication and secrets, I would be strict. Session identifiers should be issued through secure cookies, not exposed to front-end JavaScript unless there is a very specific reason; MDN recommends `Secure`, `HttpOnly`, and restrictive `SameSite` settings for sensitive cookies. OWASP also advises against storing tokens in insecure browser locations such as local storage and stresses keeping secrets in CI/CD or a secrets-management system without leaking them through pipeline output. That lines up with your requirement to keep passwords, tokens, and secrets out of reports and logs. citeturn20view1turn20view0

The release proof for each sprint should be uncompromising. Codex should provide route screenshots, live route URLs, browser verification, cache-bust/build proof, queue behavior proof, and security proof. Workbox even documents how queued background-sync requests can be inspected and tested in DevTools, which is useful for browser-level validation before a real-device pass. citeturn21view2turn12view6

The minimum proof bundle I would require from every serious productization run is:

- screenshots of `/account`, `/customers`, `/customers/:id`, `/visits`, `/today-route`, `/live-map`, and `/reports`
- the exact live URLs used
- the visible build/version string shown in the UI
- a note on service-worker update behavior and cache-bust proof
- a browser-network proof that app API traffic is same-origin where expected and that there are no accidental localhost calls
- offline queue evidence showing create-while-offline and sync-after-reconnect behavior
- confirmation that no new provisioning endpoint, backdoor, DNS change, or `www.dopaminepharma.com` modification was introduced

## Codex execution plan and prompt

The safest execution sequence is the phased one you proposed, with one refinement: each phase should leave the product in a **coherent, reviewable state**, not a partially styled scaffold.

**Foundation phase.** Fix Arabic text rendering, true RTL, navigation, and `/account`; add a visible build/version string and service-worker update proof; remove any invoice/order/billing/payment UI from the navigation and route tree; and make the app visually credible in dark mode and mobile-first layouts.

**Field workflow phase.** Build `/customers`, `/customers/:id`, `/visits`, and `/today-route` around real pharmaceutical concepts: doctor/pharmacy accounts, territory ownership, frequency plan, due/overdue status, visit history, start/end visit, notes, call/discussion capture, GPS start/end, and submit/lock behavior.

**Reporting phase.** Add rep and manager reports, export where already supported, and controlled inquiry/complaint capture. Only after that should you run the real-device pass for GPS and offline/reconnect behavior.

The prompt below is the one I would send to Codex next.

```text
You are working inside the existing DOPAMINE CRM Suite project and the existing PR branch.

Project:
D:\ALQASEER_DEV\dopamine-crm-suite_PLAYGROUND

Branch:
codex/field-ready-completion

PR:
#83 is OPEN and Draft.
DO NOT merge.
DO NOT mark Ready for Review.
DO NOT change PR state without explicit human approval.

Hard boundaries:
- Do not touch www.dopaminepharma.com
- Do not change DNS
- Do not deploy Cloudflare Workers
- Do not create a root wrangler.toml
- Do not create any provisioning endpoint, bootstrap endpoint, backdoor, hidden admin path, or temporary auth bypass
- Do not expose passwords, tokens, secrets, cookies, env values, or internal keys in code, docs, screenshots, reports, logs, or run artifacts
- Do not add invoice, sales, billing, payment, collection, or inventory-selling UI
- If legacy UI for those exists, hide/remove it from this branch’s visible navigation and pages

Objective:
Turn the current prototype into a credible Arabic RTL Field Force CRM for a pharmaceutical company, focused on:
- doctors
- pharmacies
- territories
- rep assignments
- customer profile
- visit history
- monthly frequency target
- due / overdue customers
- Start Visit
- GPS start
- visit timer UI
- Start Call inside visit
- call timer UI
- structured notes
- End Visit
- GPS end / submit
- rep and manager reports
- export only if already supported by current stack

Critical product rules:
- This is a FIELD CRM, not an ERP and not a billing system
- No fake “PASS” language without proof
- Do not claim “workflow implemented” unless you show route-by-route proof
- If real doctors/pharmacies are not already present in repo/data/files, do NOT invent them as if real
- If real data is missing, create clean import templates and clearly label all seed data as demo/missing
- Arabic text must render as proper Arabic, never as unicode escapes like \u0645...
- UI must be truly RTL and mobile-first, not just mirrored colors
- Dark mode must be coherent and professional
- /account, /customers, /customers/:id, /visits, /today-route, /live-map, /reports must all be reviewable

Required route contracts:
1) /account
   Must show:
   - user identity and role
   - assigned territory/territories
   - assigned customer counts
   - last sync state
   - pending offline queue count if applicable
   - geolocation permission state
   - visible build/version string for cache-bust proof
   - app support/debug info useful for QA, not secrets

2) /customers
   Must show:
   - doctors and pharmacies as distinct types
   - search and filters
   - territory-aware listing
   - due / overdue / completed frequency status
   - quick actions to open profile and start visit

3) /customers/:id
   Must show a serious customer profile:
   - customer header with type, territory, assignment, status
   - address and map context
   - frequency target and current attainment
   - due / overdue state
   - visit history timeline
   - recent notes / discussion topics
   - quick actions: Start Visit, call, navigate, add note
   - if supported, inquiry/complaint section
   - no sales/billing widgets

4) /visits
   Must show a real lifecycle:
   - planned
   - started
   - checked-in
   - active/in-progress
   - ended
   - submitted/synced
   Include timestamps and state badges.

5) /today-route
   Must show:
   - today’s planned customers/visits
   - route order
   - start times / windows where available
   - due/overdue emphasis
   - direct action buttons
   - empty states handled professionally

6) /live-map
   Must be operational, not decorative:
   - map with current relevant context
   - active visit location if visit is in progress
   - assigned nearby customers if supported
   - clear permission/unsupported states
   - no fake live-tracking claims

7) /reports
   Must include practical field reports such as:
   - visits planned vs completed
   - due vs overdue customers
   - frequency attainment
   - rep activity summary
   - manager territory summary
   - export only if genuinely supported

Implementation guidance:
- Model doctors/HCPs and pharmacies/HCOs properly
- Add territory + assignment + frequency plan concepts
- Add due/overdue calculation
- Use a clear Visit object and a structured Call/Discussion record inside the visit if appropriate
- Preserve backend safety and current auth behavior
- Keep same-origin API behavior intact
- Absolutely no localhost browser calls
- Absolutely no direct accidental Vercel browser calls
- Add cache-bust/version proof because service worker/PWA may serve stale assets
- Make the live UI itself show a version/build marker so reviewers can verify the deployed build
- If offline queue exists or is added, document exact behavior and proof

Evidence required in your response:
- what changed, route by route
- exact live URLs reviewed
- screenshots for:
  /account
  /customers
  /customers/:id
  /visits
  /today-route
  /live-map
  /reports
- browser validation notes
- cache/version proof
- explicit security statement that no provisioning/backdoor/secrets leakage was introduced
- exact tests run
- exact files changed
- one run folder under docs/_runs/run_YYYYMMDD_HHMMSS with artifact summary

Result policy:
- PASS only if the routes above are genuinely working, professional, and evidenced
- WARNING if scope is partially complete but foundation is solid and honest
- BLOCKED if the app still has broken Arabic, empty routes, fake workflow, unsafe changes, or missing proof

If full scope is too large for one safe pass, then do this honestly:
- complete Phase A only:
  Unicode/RTL fix + /account + navigation + build/version proof + removal/hiding of billing/invoice UI
- classify as WARNING
- state exactly what remains for Phase B and Phase C
- do NOT pretend full field CRM is complete
```

My executive recommendation is to judge the next Codex response by one standard only: **does the product now feel like a serious field tool for an Arabic-speaking medical representative visiting doctors and pharmacies in territory, or does it still feel like a prototype with better colors?** If the answer is the second one, it is not ready.