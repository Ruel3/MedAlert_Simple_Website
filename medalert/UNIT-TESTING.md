# MedAlert Unit Testing

## Purpose

This document describes how to run the unit tests for MedAlert and summarizes the behavior they check. The tests use Node.js's built-in test runner, so no additional test dependencies are required.

## Requirements

- Node.js 22.5 or later
- Run commands from the `medalert` project folder

## Running the tests

```powershell
npm test
```

The test command runs all `*.test.js` files in the `test` folder.

## Test coverage

### Frontend utility functions

`test/frontend-utils.test.js` checks:

- Phone number formatting and validation
- Email and national ID validation
- Password length validation, including boundary values
- List parsing, trimming, blank removal, and case-insensitive duplicate removal
- Joining list values
- Date/time formatting and invalid-date handling
- Trimming scanned QR text
- Generating SVG path data from a QR matrix

### Backend QR encoder

`test/backend-qr.test.js` checks:

- A short payload produces a square binary QR matrix of the expected size
- A longer payload selects a larger QR version
- Payloads beyond the supported capacity are rejected with a `RangeError`

### Administrator API integration

`test/backend-admin.test.js` starts an isolated server with a temporary SQLite database and checks:

- Administrator sign-in and role restrictions
- Staff registration creates a pending account
- Pending staff cannot sign in until approved
- An administrator can approve staff, after which staff sign-in succeeds
- Staff cannot access administrator-only routes

## Latest test result

The suite was run with Node.js v26.13.0. All 14 tests passed:

```text
tests 14
pass 14
fail 0
```

## Scope and limitations

Most tests cover pure utility functions and QR matrix generation. The administrator test covers selected HTTP authentication and approval flows against a temporary SQLite database. The suite does not test the browser interface or the complete patient profile, sharing-consent, lookup, and camera-scanning workflows.
