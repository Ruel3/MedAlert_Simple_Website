# MedAlert Fixes

Date: 2026-11-06

## Staff registration requires administrator approval

### Problem

Anyone could register as medical staff, then use their account to search patient profiles before approval.

### Fix

The staff registration form no longer asks for or requires an invitation code. New staff accounts are created
with `staff_approved` set to disabled and cannot sign in until an administrator approves them.

## Patient sharing requires opt-in

### Problem

New patient profiles were shareable with staff immediately, without an explicit patient choice.

### Fix

- New profiles now default to sharing disabled.
- A one-time database migration disables sharing for existing profiles when the updated server first starts.
- Profile edits preserve the patient's current sharing choice.
- Patients can explicitly enable or revoke sharing in their profile settings. Lookup checks that choice before returning medical information.

After updating, patients must sign in and enable sharing again if they want staff to access their profiles.

## Verification

The following checks passed after the fixes:

- New profile returned `consent: false`.
- Staff lookup was blocked before patient opt-in, allowed after opt-in, and blocked again after consent was revoked.
- Login session cookie included `HttpOnly` and `Secure`.
- JavaScript syntax checks passed for all seven backend and frontend files.
- `npm audit --omit=dev` reported zero vulnerabilities.
- Local HTTPS health check returned `{"ok":true}`.

The invitation and sharing flows were tested against an isolated server and temporary database, not the existing application database. Browser UI automation could not be completed because the forwarded browser URL redirected to a Dev Tunnels/GitHub sign-in page.

## Important limitations

These fixes reduce two specific risks; they do not make MedAlert suitable for real medical records. Staff identity verification, login rate limiting, stronger password policy, production TLS and hosting controls, and privacy/compliance review remain necessary before any clinical use. Do not enter real medical data.
