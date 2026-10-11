# Security and privacy status

Last reviewed: 2026-10-11

## Current protections

- The unauthenticated cloud-sync read, write, and delete endpoints have been disabled. They previously trusted a caller-supplied user ID, which was not safe.
- The client now reports that cloud backup/restore is disabled instead of treating an unsuccessful save as a successful sync.
- Supplement schedules and dose logs currently use browser local storage for local app functionality.

## Important limitations — do not claim complete privacy yet

- Browser local storage is **not end-to-end encrypted**. Someone with access to the same unlocked browser profile or device can potentially inspect it.
- The custom email/password auth routes need a proper server-validated session system before they can protect private cloud data. A user ID or client-side account state is not proof of identity.
- Server-side account and security-email records can contain personal data and authentication-related links/tokens. Access to the deployed server, filesystem, logs, or backups must be tightly restricted.
- The AI chat endpoint sends the submitted message and supplement/log context to Google Gemini when configured. Do not describe those AI conversations as visible only to the user or end-to-end encrypted.
- Google Calendar data is sent to Google when a user explicitly connects and syncs their calendar.

## Requirements before re-enabling cloud sync

1. Replace the custom authentication implementation with a maintained identity provider and verify every API request server-side.
2. Use per-user authorization checks on every read/write/delete operation; never trust a client-supplied account ID.
3. Encrypt user data in the browser before upload, with encryption keys that never reach the server, if the goal is to prevent the app operator from reading cloud backups.
4. Do not store raw verification tokens, complete verification links, or sensitive message content in logs. Store only hashed, short-lived, single-use tokens where needed.
5. Add rate limiting, request-size limits, security headers, CSRF protections where applicable, and automated authorization-isolation tests.
6. Add secure account deletion and data-retention handling; verify server backups and logs are covered.
7. Test with two independent accounts and prove one cannot read, modify, or delete the other's data.

Until those requirements are met, cloud sync must remain disabled. This document is a technical status note, not a claim of certification or a guarantee of security.
