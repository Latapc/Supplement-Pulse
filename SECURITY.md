# Security and privacy status

Last reviewed: 2026-10-11

## Current protections

- The unauthenticated cloud-sync read, write, and delete endpoints are disabled. They previously trusted a caller-supplied user ID.
- Sign-in uses Google through Firebase Authentication; the former custom password/IP routes are not mounted.
- Google Drive account data is encrypted in the browser using AES-256-GCM before upload. The current convenience-focused flow automatically generates a random AES-256 key and stores that key in a separate file in the same Google Drive `appDataFolder` as the ciphertext.
- Google sign-in restores the account's cloud data automatically; edits are automatically backed up after a short debounce.
- Because the key and ciphertext are both accessible through the same Google account's app-data scope, this is not developer-blind or strong end-to-end encryption. Anyone who obtains both files can decrypt the data. The design prioritizes easy recovery and account-level access control over key secrecy.
- The legacy unauthenticated server sync endpoints remain disabled.

## Important limitations

- Browser local storage remains the app's working cache and is **not encrypted by this backup feature**. Someone with access to the same unlocked browser profile/device may inspect it.
- Client-side backup encryption protects the Drive backup contents only. It does not protect data a user sends to optional AI features, Google Calendar, or other connected services.
- A compromised device, malicious browser extension, injected client code, or a user entering the passphrase into a fake app could expose data or the passphrase.
- A weak or reused passphrase may be vulnerable to guessing. Users should use a unique, hard-to-guess passphrase and keep it in a trusted password manager.
- Backups made by the earlier plaintext format cannot be decrypted by the new restore code. Create a new encrypted backup from the original device; do not overwrite the only copy of important data until the encrypted backup has been verified.
- The app has not yet been verified by a production build, Google OAuth review, or two-account/two-device security test. Do not claim complete privacy or security certification.
- The AI chat endpoint sends the submitted message and supplement/log context to Google Gemini when configured. Google Calendar data is sent to Google when a user explicitly connects and syncs a calendar.

## Required validation

1. Run the production build and TypeScript checks.
2. Test backup and restore on two devices using the same Google account and passphrase.
3. Test wrong passphrases, missing backups, malformed backup files, and OAuth permission failures.
4. Test two different Google accounts to confirm their Drive app-data areas are isolated.
5. Audit local storage, logs, analytics, AI requests, and all server endpoints for unintended data exposure.
6. Publish an accurate privacy policy with a real privacy contact and complete the applicable Google OAuth verification.

This document records the current implementation and known limitations; it is not a guarantee of security.
