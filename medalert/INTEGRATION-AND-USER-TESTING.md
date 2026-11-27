# MedAlert Integration and User Testing

## Purpose and status

This guide provides manual test procedures for checking that MedAlert's browser interface, server, and SQLite database work together, followed by a separate protocol for observing people using the interface.

The execution report below records integration and evaluator walkthrough checks completed on 2026-11-06. A detailed plan, task-by-task results, observed issues, debugging, and improvements are documented in [USER-TEST-REPORT.md](./USER-TEST-REPORT.md). No recruited human-participant study was conducted.

## Integration test execution report

**Run date:** 2026-11-06  
**Environment:** Isolated local MedAlert test server on `127.0.0.1:8011`; Windows; disposable SQLite database and fictional test data  
**Automated command:** `npm test` from the `medalert` project folder  
**Outcome:** 14 tests passed, 0 failed. This includes one backend HTTP/API integration test; the other tests cover utilities and QR encoding.

The health endpoint and application page returned HTTP 200. Browser walkthroughs verified patient registration, sign-in, profile save, sharing defaults and changes, staff registration and pending approval, admin approval, staff lookups by National ID and phone, access history, denial after consent revocation, and sign-out protection. Two normal empty states that generated HTTP errors in the browser console were corrected; see the user-test report.

| ID | Result | Observed outcome |
|---|---|---|
| INT-01 | Pass | Local health endpoint returned HTTP 200 and `{"ok":true}`; application page returned HTTP 200 and rendered in the browser. |
| INT-02 | Pass | Fictional patient account sign-in opened the patient dashboard. |
| INT-03 | Pass | Fictional profile saved and values remained displayed. |
| INT-04 | Pass | New profile sharing switch was unchecked. |
| INT-05 | Partial | No lookup was attempted before first opt-in; after revocation, lookup was denied without disclosing profile data. |
| INT-06 | Pass | Patient enabled sharing; staff could retrieve the profile. |
| INT-07 | Pass | Patient revoked sharing; a subsequent staff lookup was denied. |
| INT-08 | Partial | National ID and phone lookups returned the same profile. Camera scanning was not tested. |
| INT-09 | Partial | QR graphic rendered; scanning and printing were not tested. |
| INT-10 | Pass | Pending staff could not sign in; administrator approval allowed staff sign-in; signed-out dashboard navigation returned to sign-in. |
| INT-11 | Pass | Sign-out ended the session; protected dashboard redirected to sign-in. |
| INT-12 | Not run | Database persistence across a full server restart was not tested. |
| INT-13 | Partial | Administrator approval flow passed; broader staff approval verification remains separate test coverage. |
| User tasks | Evaluator walkthrough | Task scripts were executed by one evaluator in patient, staff, and administrator roles. No human-participant feedback was collected. |

**Observed and fixed issues:** Expected signed-out session lookup (401) and first-profile absence (404) produced console errors. These normal states now return HTTP 200 with explicit null values, with automated regression assertions. See [USER-TEST-REPORT.md](./USER-TEST-REPORT.md).

**Conclusion:** Patient registration/profile/sharing and selected staff/admin flows passed in the evaluator walkthrough. Camera/QR decoding, persistence across restart, and human participant usability remain unverified. No real medical information was used.

## Safety and test setup

- Use only fictional test data. Do not enter real names, contact details, medical information, or insurance information.
- Run these checks locally or in a private test deployment, not on a publicly accessible production service.
- Use a separate, disposable SQLite database. Do not point `MEDALERT_DB_PATH` at the application's existing database.
- Do not include passwords, session cookies, or personal data in screenshots, notes, or bug reports.
- Stop the test server when finished. Keep the test database only as long as needed, then remove the specific test database and its SQLite `-shm` and `-wal` files if present.
- The local development certificate may cause a browser warning. Only proceed for the local test server if you understand and trust the local certificate; do not bypass certificate warnings on public sites.

## Requirements

- Node.js 22.5 or later
- A modern browser
- The project dependencies installed if required by the local environment
- The `medalert` project folder

## Starting an isolated test server

Open PowerShell in the `medalert` project folder. Use a unique database filename in the Windows temporary folder:

```powershell
$env:MEDALERT_DB_PATH = Join-Path $env:TEMP 'medalert-integration-test.sqlite'
npm start
```

Keep the server running during the tests. In a browser, open `https://localhost:443`. The server should report the database path it is using. Confirm it is the temporary path before entering any test data.

In another PowerShell window, check the health endpoint:

```powershell
Invoke-RestMethod https://localhost:443/health
```

Expected result: an object with `ok` set to `true`. If the development certificate is not trusted, the command may need an appropriately configured local certificate; do not disable TLS checks globally.

The local demo accounts are created only outside production:

| Role | Email | Password |
|---|---|---|
| Patient | `demo@medalert.demo` | `demo123` |
| Medical staff | `doctor@medalert.demo` | `demo123` |

If these credentials are unavailable, create disposable test accounts. Staff accounts require administrator approval after registration.

## Integration test cases

Run each case in order. Mark each result as **Pass**, **Fail**, or **Blocked**, and record the observed behavior without including sensitive information.

| ID | Test | Steps | Expected result |
|---|---|---|---|
| INT-01 | Health and page load | Start the isolated server, open `https://localhost:443`, and check `/health`. | The health endpoint reports `ok: true`; the MedAlert page loads without a server error. |
| INT-02 | Patient sign-in | Sign in with the local demo patient account, or a disposable patient account. | Sign-in succeeds and the patient view is shown. Incorrect credentials are rejected with a clear error. |
| INT-03 | Profile read and save | Edit the test profile with fictional values, save it, navigate away, and return to the profile. | The saved values are shown after returning; the page gives appropriate save feedback. |
| INT-04 | Patient sharing defaults off | For a newly created test patient, inspect the sharing control before changing it. | Sharing starts disabled. |
| INT-05 | Staff access denied before consent | Sign in as staff in a separate browser profile or private window. Search for the test patient using a supported lookup method while the patient has sharing disabled. | No patient medical profile is disclosed. The UI shows a suitable not-found or inaccessible result. |
| INT-06 | Patient enables sharing | Sign in as the patient, explicitly enable profile sharing, and save the choice. Sign back in as staff and repeat the lookup. | The consent choice persists and the authorized staff lookup can access the shared profile. |
| INT-07 | Patient revokes sharing | Sign in as the patient, disable sharing, then repeat the staff lookup. | The lookup no longer discloses the profile after consent is revoked. |
| INT-08 | Lookup methods | With sharing enabled, try the supported national ID and phone lookups using the test patient's fictional values. If camera access is available, also test the QR scanner. | Supported lookup methods return the same patient's profile. Invalid or unknown values do not disclose another profile. |
| INT-09 | QR privacy and lookup | Open the patient's QR view. Inspect the displayed QR payload only in the test environment, then use the staff scanner or QR lookup. | The QR represents a reference rather than the patient's medical details; the signed-in staff lookup respects the patient's sharing choice. |
| INT-10 | Role restrictions | While signed in as a patient, try to open staff-only lookup functionality. While signed out, try to access profile information. | Protected actions require the appropriate signed-in role; no unauthorized profile data is shown. |
| INT-11 | Session and logout | Sign out, then try to revisit a protected view or reload it. | The session is ended and protected information is not available until signing in again. |
| INT-12 | Persistence across restart | Save fictional profile changes, stop the server with Ctrl+C, restart it using the same temporary database path, and sign in again. | The account, profile, and consent setting remain saved. |
| INT-13 | Staff administrator approval | Register a disposable staff account, try to sign in before approval, then approve it through the administrator dashboard and try again. | Pre-approval sign-in is rejected; post-approval sign-in succeeds. |

For INT-08, only test lookup methods presented by the running application. Camera scanning may be blocked by browser permissions or unavailable hardware; record this as **Blocked**, not as a product pass.

## User testing

User testing is an observation of people trying the interface. It is separate from the integration checks above and should not be represented as completed unless sessions were actually conducted.

### Participants and preparation

- Invite a small group of consenting participants who represent intended users, such as a patient and a medical-staff user. Do not imply that participation is medical advice or clinical validation.
- Explain that the site is a demo and must not contain real medical data.
- Use a fresh test database and fictional participant identities and profile details.
- Ask permission before taking notes, screenshots, audio, or video. Prefer notes without identifying details.
- Do not ask participants to disclose real health information, credentials, or personal contact information.
- Tell participants they can stop at any time without giving a reason.

### Facilitator instructions

1. Explain the purpose: assess whether the interface is understandable, not evaluate the participant.
2. Read the safety statement above and confirm consent to participate.
3. Give one task at a time. Avoid explaining where to click unless the participant is blocked; note any help given.
4. Ask the participant to think aloud if comfortable. Do not lead them toward the expected answer.
5. Record task completion, observable difficulties, participant comments, and assistance required.
6. Ask the short debrief questions below and thank the participant.

### Suggested tasks

Give participants tasks relevant to their role. Use only fictional information.

**Patient tasks**

1. Create a test patient account or sign in.
2. Find where to enter profile information and save a fictional allergy and medication.
3. Find the profile-sharing setting and explain whether sharing is currently enabled.
4. Enable sharing, then revoke it.
5. Find the QR code and explain what they think it is for.
6. Sign out.

**Medical-staff tasks**

1. Sign in with a test staff account.
2. Try to look up a fictional patient who has not enabled sharing.
3. Explain what the result means and what the staff user can do next.
4. After the test patient enables sharing, look up the patient using a supported method.
5. Sign out.

Do not instruct users to use real patient information or to treat the result as a clinical record.

### Debrief questions

- Which task, if any, was hardest to complete? What made it difficult?
- Was it clear whether profile sharing was on or off?
- Was it clear what the QR code does and what information it represents?
- Did any message feel confusing, unexpected, or insufficient?
- What would you change first?
- Did you encounter any accessibility, readability, keyboard, or mobile-use barriers?

### User-test measures

For each task, record:

- Completion: completed unaided / completed with help / not completed
- Approximate time, if measured consistently
- Number and type of prompts or errors
- Participant's own confidence rating, for example 1 (not confident) to 5 (very confident)
- Brief, anonymized notes and suggested improvement

Do not treat a small informal test as proof of usability, safety, accessibility conformance, or clinical suitability.

## Results sheet

Record the date, application version or commit identifier if known, browser and OS, test database filename (not its contents), and tester initials or a non-identifying role label.

| ID / participant task | Result | Observed outcome or issue | Help needed / follow-up |
|---|---|---|---|
| INT-01 | Pass | Health and page returned HTTP 200; page and registration forms rendered. | See execution report above. |
| INT-02 | Pass | Patient sign-in opened dashboard. | See [USER-TEST-REPORT.md](./USER-TEST-REPORT.md). |
| INT-03 | Pass | Profile save and display confirmed. | |
| INT-04 | Pass | Sharing defaulted off for a new profile. | |
| INT-05 | Partial | Denied after revocation; lookup before initial opt-in not attempted. | |
| INT-06 | Pass | Lookup succeeded after opt-in. | |
| INT-07 | Pass | Lookup denied after revocation. | |
| INT-08 | Partial | National ID and phone passed; camera not tested. | |
| INT-09 | Partial | QR graphic rendered; decode/print not tested. | |
| INT-10 | Pass | Pending staff blocked; approved staff allowed; signed-out dashboard redirected. | |
| INT-11 | Pass | Logout and protected-route redirect passed. | |
| INT-12 | Not run | | |
| INT-13 | Partial | Configured invitation registration passed. | Missing/invalid-code cases still need testing. |
| User task(s) | Evaluator walkthrough | Patient, administrator, and staff scripts executed; no participants recruited. | Conduct a consented participant study for user feedback. |

## Completion criteria

The integration test run is complete when each applicable case has a recorded result, failures have a reproducible description, and blocked cases include the reason. Resolve or explicitly accept high-impact failures before relying on the tested build.

User testing is complete for a study only after participants have consented, the planned sessions have been conducted, and anonymized observations and follow-up actions have been recorded. User testing does not replace security, privacy, accessibility, regulatory, or clinical review.

## Limitations

These manual procedures do not provide automated regression coverage or prove the absence of defects. They do not validate production deployment configuration, load capacity, clinical accuracy, staff identity, regulatory compliance, or suitability for real medical records. MedAlert is a demo; do not use real medical data.
