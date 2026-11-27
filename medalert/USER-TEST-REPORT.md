# MedAlert User Testing Report

**Run date:** 2026-11-06  
**Status:** Evaluator-led browser walkthrough completed; human-participant study not conducted  
**Application:** MedAlert, local test instance  
**Environment:** Windows, Node.js v26.13.0, browser walkthrough at `http://127.0.0.1:8011`  
**Data safety:** Disposable SQLite database and fictional test accounts/details only. No real medical or personal data used.

## 1. Test plan

### Objective

Assess whether a patient and medical-staff user can complete the main account, profile, sharing, and lookup tasks; verify role boundaries and record reproducible problems that interfere with the workflow.

### Scope and method

The evaluator followed the patient and staff task scripts below in the browser against a separate loopback server and temporary database. The administrator approval step was included because staff accounts require approval before use. Results reflect observed completion, application messages, and server/API responses.

This was a guided evaluator walkthrough, not a usability study with recruited participants. No think-aloud feedback, satisfaction ratings, completion-time measurements, or accessibility audit were collected. Do not represent these results as participant feedback or clinical validation.

### Participants and roles

No external participants were recruited. One evaluator operated the browser as:

- A fictional patient creating and managing a profile
- A fictional administrator reviewing a staff request
- A fictional medical-staff user searching for the patient

### Task scripts and success criteria

| Task | User instruction | Success criterion |
|---|---|---|
| P-01 | Create a patient account and sign in. | Account is created, login succeeds, and patient profile form appears. |
| P-02 | Review the sharing setting, create a profile with fictional data, and save it. | New profile starts with sharing off; save confirmation appears and values remain visible. |
| P-03 | Open the QR-code and access-history sections. | QR representation displays; history lists successful staff access with method and staff details. |
| P-04 | Enable sharing, then turn sharing off again. | UI confirms each change and the setting reflects the saved state. |
| S-01 | Register as medical staff, then try to sign in before approval. | Request confirmation appears; pending sign-in is blocked with an explanatory message. |
| A-01 | Sign in as administrator and approve the pending staff account. | Pending account is visible, approval succeeds, and it leaves the pending list. |
| S-02 | Sign in as approved staff and search by National ID and phone while sharing is enabled. | Both methods return the same fictional profile; access is logged. |
| S-03 | Search again after patient revokes sharing. | The profile is not disclosed and a generic inaccessible/not-found message appears. |
| S-04 | Sign out and attempt to reopen the protected dashboard. | The user is redirected to sign-in and protected data is not displayed. |

### Test environment and controls

- Server: isolated local MedAlert process on port `8011`, production-mode HTTP bound to loopback.
- Database: separate temporary SQLite file `medalert-user-test-20261106.sqlite`; the normal app database was not used.
- Test accounts, invitation, and profile values were fictional, disposable, and not recorded here.
- The test server was configured with temporary administrator and staff-invitation values. Secrets are intentionally omitted.

## 2. Execution results

| Task | Result | Observed evidence |
|---|---|---|
| P-01 | Pass | Patient account creation showed a success toast and navigated to sign-in. Login opened the patient dashboard. |
| P-02 | Pass | Sharing switch was initially unchecked. Fictional allergy, condition, medication, and emergency-contact values saved; “Profile saved.” appeared and values remained displayed. |
| P-03 | Partial | QR code panel rendered. After staff lookups, access history listed the staff user, organization, time, and both lookup methods. QR decoding, printing, and camera scanning were not tested. |
| P-04 | Pass | Enabling and disabling sharing updated the switch and displayed confirmation messages. |
| S-01 | Pass | Staff registration displayed the pending-approval message. Sign-in before approval was rejected with “Your staff account is awaiting administrator approval.” |
| A-01 | Pass | Administrator dashboard showed the pending fictional account; approval removed it from the pending list. |
| S-02 | Pass | National ID and phone searches returned the same patient profile while sharing was enabled. Both successful accesses appeared in the patient’s access history. |
| S-03 | Pass | After sharing was turned off, another lookup returned “No accessible profile found.” No patient profile was displayed. |
| S-04 | Pass | Sign-out returned to the home page; directly opening the dashboard redirected to the sign-in page. |

### Additional verification

- `/health` returned HTTP 200 with `{"ok":true}`.
- Anonymous `/api/auth/me` returned HTTP 200 with `{"user":null}` after the improvement below.
- A newly registered patient with no saved profile saw the empty profile form with sharing disabled; no profile-load error was shown after the improvement below.
- `npm test` passed all 14 tests, including the HTTP/API integration test and added checks for anonymous session and empty-profile responses.

## 3. Issues found, debugging, and improvements

The evaluator inspected browser console events and reproduced the initial page-load sequence on the isolated server. The page itself rendered, but the normal signed-out session check generated an HTTP 401 console error. Opening the dashboard for a patient with no profile also generated an expected HTTP 404 console error. These were normal first-visit states, not authentication bypasses or data leaks, but obscured actual operational errors.

| ID | Severity | Reproduction and evidence | Root cause | Improvement and retest |
|---|---|---|---|---|
| UT-BUG-01 | Low | Open the site signed out. The session bootstrap request returned 401 even though signed-out browsing is normal. | `/api/auth/me` treated the absence of a session as an exceptional API failure. | It now returns HTTP 200 with `user: null` for an anonymous session. The client reports actual bootstrap errors instead of silently treating all errors as signed-out. Verified by HTTP check and an added automated assertion. |
| UT-BUG-02 | Low | Sign in as a newly registered patient with no profile. The profile form appeared, but the expected first-profile lookup returned 404 and showed as a browser-console error. | A missing profile was represented as an HTTP error, even though the UI treats it as an ordinary empty state. | `GET /api/profile` now returns HTTP 200 with `profile: null` for a patient without a profile. Actual request errors remain surfaced to the user. Verified in the browser and with an added automated assertion. |

Pending staff login (403) and inaccessible patient lookup (404) remain deliberate authorization/privacy responses; they were observed to show clear user-facing messages and were not changed.

## 4. Regression verification

After the improvements:

```text
npm test
tests 14
pass 14
fail 0
```

The automated integration test now asserts that anonymous session lookup returns `{ "user": null }` and an authenticated patient without a profile receives `{ "profile": null }`. Existing staff approval and role-restriction assertions continue to pass.

## 5. Limitations and follow-up

- This evaluator walkthrough demonstrates task execution and defect remediation; it is not evidence that representative users found the interface intuitive.
- The QR graphic displayed, but QR decoding, print output, and camera permission/device behavior were not tested.
- Persistence across a full server restart, mobile layouts, keyboard-only use, screen-reader behavior, and assistive-technology accessibility were not tested.
- The walkthrough does not establish clinical accuracy, staff identity, privacy/compliance suitability, or production readiness. Do not use real medical data.
- For a genuine user study, recruit consenting patient-role and medical-staff-role participants, repeat the task scripts without coaching, record anonymized completion/help/error observations and participant feedback, and update this report without inventing results.

## 6. Cleanup

The test instance used a separate temporary database and was stopped after execution. Temporary database files should be removed after the server is stopped. The normal application database was not modified by the walkthrough.
