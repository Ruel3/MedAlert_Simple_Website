# MedAlert Test-Fix Report

Date: 2026-11-06

## Current review

The isolated user-testing walkthrough exercised patient registration/profile/sharing, administrator staff approval, staff lookup, access history, and logout. The health endpoint returned HTTP 200 with `{"ok":true}`, and `npm test` passed all 14 tests.

| ID | Severity | Finding | Evidence and impact | Status |
|---|---|---|---|---|
| UT-BUG-01 | Low | Signed-out startup returned an expected authentication error | `/api/auth/me` returned HTTP 401 for a normal anonymous browser session, creating a console error. | Fixed: returns HTTP 200 with `user: null`; regression assertion passes. |
| UT-BUG-02 | Low | New patient profile load returned an expected not-found error | `/api/profile` returned HTTP 404 before the patient had created a profile, creating a console error despite the empty form being the expected state. | Fixed: returns HTTP 200 with `profile: null`; browser and regression assertion pass. |

The profile-save, sharing, staff approval, lookups, access-history, and logout workflows passed in the evaluator walkthrough. Camera scanning and QR decoding were not tested. This was not a human-participant study.

## Issues found and fixed

| Check that failed before the fix | Fix applied | Retest result |
|---|---|---|
| Staff registration accepted sign-ups without verification, allowing anyone to create a medical-staff account. | Staff accounts now require administrator approval. The staff registration form and API no longer require an invitation code. | Staff registration created a pending account; sign-in was rejected until administrator approval. |
| A newly created patient profile had sharing enabled by default, so staff could retrieve its medical information without the patient opting in. | New profiles now default to sharing off. A one-time database migration opts existing profiles out; patients must explicitly enable sharing. | A new profile returned `consent: false`; staff lookup was denied until the patient enabled sharing. After opt-in, lookup returned the profile. |

## Checks that passed

- JavaScript syntax checks passed for all seven backend and frontend JavaScript files.
- `npm audit --omit=dev` reported zero vulnerabilities.
- The local HTTPS health endpoint returned `{"ok":true}`.
- Patient registration and login worked; the session cookie included `HttpOnly` and `Secure`.
- Patient sharing could be explicitly enabled and staff lookup then succeeded.

## Not verified or still outstanding

- The evaluator walkthrough did not include recruited human participants, QR decoding/camera access, mobile or assistive-technology testing, or persistence across a full server restart. See [USER-TEST-REPORT.md](./USER-TEST-REPORT.md).
- Administrator approval is required before staff sign-in but does not independently verify staff identity or credentials.
- Login rate limiting and stronger password requirements have not been implemented.
- This application remains a demo and is not suitable for real clinical records. A production deployment still requires appropriate identity verification, privacy and compliance review, operational controls, and a trusted production TLS setup.

The evaluator walkthrough and API-flow retests used an isolated local server and temporary SQLite database; the existing application database was not used.
