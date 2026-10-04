# Current route: Direct intake for Magic

Project URL: https://diwkgshzirfttqemhwjc.supabase.co
Website origin: https://arielnoy27.github.io
Planned endpoint: https://diwkgshzirfttqemhwjc.supabase.co/functions/v1/submit-lead

Status: local preparation only. Formspree is still the active HTML action. The
existing leads table is sufficient; DO NOT run schema.sql again.

The earlier Formspree webhook path below is superseded because this account
requires a paid upgrade. Keep its code as reference; do not deploy that function.

## Next account step
Create a Cloudflare Turnstile widget for hostname arielnoy27.github.io, Managed
mode. Cloudflare does not need to host the website. The site key is public; store
the secret key only in Supabase Edge Function secrets as TURNSTILE_SECRET_KEY.
Never paste the secret key into chat or website code.

## Deployment after Turnstile is configured
1. In Magic, deploy a new Edge Function via the dashboard editor named submit-lead.
   Paste crm/submit-lead-dashboard.ts (a standalone version with no local imports).
2. Set TURNSTILE_SECRET_KEY in Edge Function secrets. Supabase provides its URL
   and service-role key to functions; none of these secrets belong in the frontend.
3. Disable legacy JWT verification for this public submit-lead function only.
   The handler requires validated Turnstile tokens with hostname and action checks.
4. After a controlled test page verifies database insertion, activate BOTH forms:
   change action to the planned endpoint, add data-intake="supabase", and put
   <div class="cf-turnstile" data-sitekey="YOUR_PUBLIC_SITE_KEY" data-action="lead"></div>
   before the submit button. Add the script to both pages:
   <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
5. Test successful receipt, invalid fields, failure recovery and fresh challenge
   tokens on retries. UUID retries insert once. Formspree HTML actions are retained
   in this archive to avoid accidentally switching a live site too early.
6. Email notifications and Google Sheets sync have NOT been implemented yet. Do
   not cut over the live form until those and live browser tests are ready.

The public endpoint accepts JSON only. Activation requires working JavaScript;
without JS, display a contact alternative rather than relying on a native POST.
CORS restricts browser origin, but is not authentication. Turnstile is the enforced
anti-bot check. Distributed rate limiting is a further production-hardening task;
this starter does not implement it. The shared github.io hostname cannot isolate
other repositories on the same account; verify exact deployment during testing.

Local tests: node --test crm/*.test.mjs — 17 passed. External services are mocked;
no live Supabase writes, Deno deployment or browser visual tests were performed.

Sources:
https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
https://supabase.com/docs/guides/functions/quickstart-dashboard

---
Historical webhook implementation notes (not the active plan):

# Ariel Noy — CRM intake foundation

Status: prepared and locally tested; NOT deployed or connected to a live database.
No private CRM interface is included yet. Use the Supabase project dashboard for
initial owner-only lead management after deployment.

## Decision
Keep the existing Formspree endpoint and GitHub Pages website. Add structured
optional event fields and receive signed Formspree submissions in a Supabase Edge
Function. Do not purchase a Formspree upgrade just to activate this prototype.
Webhooks currently require Professional or Business: verify the existing account
first. If unavailable, revisit a direct intake endpoint with spam protection and
reliable email delivery before choosing or paying for a replacement.

## Included changes
- English and Hebrew forms: optional date, venue/city and guest count.
- Shared form handler: all-field validation, localized persistent feedback,
  duplicate click suppression, timeout recovery and preserved retry ID.
- Original Formspree action remains usable without JavaScript, with native HTML
  validation. JS-dependent UUID deduplication falls back to a payload fingerprint.
- Lead database schema with public access revoked and row-level security enabled.
- Webhook receiver: provider signature verification, five-minute timestamp window,
  64 KiB request cap, field validation, atomic duplicate suppression and failure
  responses. It logs status codes only, not customer data or secrets.
- Duplicate deliveries cannot overwrite sales progress, notes or prices.

## Activation (account access required)
1. Inspect the Formspree account for form xkoqwpee and its plan. Confirm Simple
   Webhook and signing-secret support. Do not use an unsigned hook.
2. Create/select an owner-controlled Supabase project and record its region.
3. Apply schema.sql once in its SQL editor. This creates public.leads; if a table
   already exists, review a migration rather than running this blindly.
4. From this crm directory, link the Supabase CLI to the selected project.
5. Set FORMSPREE_SIGNING_SECRET and FORMSPREE_FORM_ID using the Edge Function secrets
   settings. Use the exact form identifier in a real webhook payload; verify it
   matches xkoqwpee. Supabase provides SUPABASE_URL and its service-role key.
6. Deploy formspree-lead using this directory's supabase/config.toml. The function
   uses provider signatures rather than a Supabase JWT; do not remove signature
   verification. Never put the signing secret or service-role key in website JS.
7. Add the function URL as a signed Simple Webhook in Formspree.
8. With the owner's authorization, submit one clearly marked test inquiry. Verify
   Formspree receipt, email notification and exactly one leads row. Test EN and HE,
   real CAPTCHA settings, mobile layouts and keyboard accessibility before release.
9. Verify provider retry behavior (not established by this prototype). Check
   Formspree submissions against leads regularly until automated reconciliation
   and alerts are implemented. Formspree acceptance does not guarantee CRM storage.
10. Publish the website edits only after live submission acceptance is verified.
    Upload the website files/assets to Pages; keep crm tooling out of the published
    site where practical. No secrets are included in this archive.

## Tests
Node 22+:
    node --test crm/*.test.mjs
    node --check common.js

11 local tests cover frontend failures, retry identity, double clicks, signature
validation, mapping, legacy delivery fingerprints, invalid data, database failure,
atomic conflict behavior, oversized requests and configuration errors.
No live provider requests, PostgreSQL execution, Deno deployment, or browser visual
QA were performed. Browser CAPTCHA behavior remains an activation gate.

## Limits and recovery
Signed invalid payloads receive 422; failed database writes receive 503. These
responses are not a durable dead-letter queue. Formspree remains the recovery
source: inspect its submissions, correct mapping problems and replay/reconcile via
a separately reviewed server-side tool if needed. Old signed requests cannot be
replayed unchanged because of the timestamp window. Never disable verification
for recovery. Legacy deduplication uses provider timestamp plus fields, so identical
submissions with identical provider timestamps may collide; new forms carry a UUID.

Do not merge leads by email or phone: one person may inquire about several events.
Revenue amounts are in ILS. Store event dates as dates and contact/follow-up times
as timezone-aware timestamps; display times in Asia/Jerusalem.

Before building a private CRM interface, implement owner-only authentication and
policies. Do not grant every authenticated user access to all customer records.
Define backup and retention arrangements before treating the database as the sole
copy. Existing WhatsApp, phone and direct email leads still require manual entry.

## Sources
- https://help.formspree.io/articles/plugins/webhooks
- https://help.formspree.io/articles/advanced-features/verify-webhook-signatures
- https://help.formspree.io/articles/building-your-form/submit-forms-with-javascript-ajax
- https://supabase.com/docs/guides/functions/secrets
