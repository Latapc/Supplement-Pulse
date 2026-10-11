# Supple Pulse Privacy Policy

**Effective date:** October 11, 2026  
**Last updated:** October 11, 2026

Supple Pulse ("we", "us", or "our") is a supplement and wellness tracking application. This Privacy Policy explains what information the app may process, why it is processed, and the choices available to you.

> **Before publishing:** Replace **[PRIVACY CONTACT EMAIL]** with an email address you monitor, and review this policy against the services and settings actually enabled in your production deployment. This template is not legal advice.

## 1. Information we process

Depending on the features you choose to use, Supple Pulse may process:

- **Account information:** email address, display name, account identifier, and authentication status when you sign in with Google and Google Drive app-data access when you authorize backup/restore.
- **Account security information:** Google/Firebase authentication identifiers and technical security logs. The current Google-only sign-in flow is designed not to maintain a separate Supple Pulse password or IP allowlist.
- **Supplement and wellness records:** supplements you enter, dose amounts and schedules, notes, planned intake times, and dose/adherence logs. These records may reveal information about your health, so please do not enter information you do not want processed.
- **Google Drive data:** after you authorize Google Drive app-data access, the app stores your supplement schedules, dose logs, profiles, and related records in your account's private Google Drive app-data area. Data is encrypted in the browser before upload and automatically synchronized after sign-in and edits. For automatic recovery, a separate app-data file contains the encryption key. This improves convenience but means the data and key are both accessible to an authorized app session; it is not developer-blind encryption. The app receives a temporary access token to perform Drive operations; tokens are kept in memory, not deliberately saved to local storage.
- **Google Calendar information:** if you deliberately connect Google Calendar, the app requests permission to create or update calendar events for supplement schedules. Calendar access is a separate feature.
- **AI assistant content:** messages and relevant supplement/log information you submit to the in-app assistant may be sent to our configured AI service provider to generate a response.
- **Technical and diagnostic information:** information included in requests, error logs, and hosting/security logs, as handled by the app and its service providers.

Information you enter locally may remain on your device unless you use a feature that sends it to a server, an AI provider, or Google Calendar. Actual storage and syncing behavior depends on the feature and current app configuration.

## 2. How we use information

We use information as needed to:

- provide supplement scheduling, dose tracking, history, and insights;
- create and maintain your account and authenticate you;
- verify email addresses and protect accounts against unauthorized access;
- create or update Google Calendar events when you request Calendar integration;
- answer questions submitted to the AI assistant;
- troubleshoot errors, maintain the service, and protect its security; and
- respond to support requests and comply with applicable legal obligations.

We do not intend the app to provide medical diagnosis or replace advice from a qualified healthcare professional.

## 3. Google sign-in and Google Calendar

Google sign-in is used to authenticate your account. When you authorize backup/restore, the app uses Google's Drive app-data area, which is separate from your ordinary Drive files and intended for app-specific data. The app's server is not intended to receive the supplement backup payload. Calendar integration is a separate feature that may request access to Google Calendar event data so that the app can create or update supplement reminders.

You can decline Calendar permission and continue using features that do not require Calendar access. You can revoke the app's Google account access through your Google Account's third-party connections settings. Revoking access may stop Calendar syncing; it does not necessarily delete events already created in your calendar. You may need to remove those events separately.

Google processes information under its own terms and privacy policy. See [Google Privacy Policy](https://policies.google.com/privacy).

## 4. AI features

If you use the in-app AI assistant, your prompt and relevant information you provide in the app may be transmitted to the AI provider configured for the service (currently intended to be Google Gemini via Google's API) to generate a response. Avoid including passwords, financial details, or other unnecessary sensitive information in prompts. The provider's processing and retention are also governed by its applicable terms and policies.

## 5. Sharing and service providers

We may process or disclose information to service providers that operate features you request, such as:

- **Google Firebase Authentication** for Google sign-in and authentication services;
- **Google Drive API** when you back up or restore data in your private app-data area;
- **Google Calendar API** when you enable Calendar syncing;
- **Google Gemini / Google AI services** when you use AI features;
- **hosting and infrastructure providers** that run the app or its server; and
- **email delivery providers** when account verification or security emails are sent.

We do not sell your personal information for money. We do not share information with third parties for their own independent marketing purposes as a core feature of the app. Information may also be disclosed if reasonably necessary to protect users or the service, comply with law, or handle a business transfer, subject to applicable law.

## 6. Storage and retention

We retain information for as long as reasonably necessary to provide the features you use, secure accounts, resolve disputes, comply with legal obligations, and enforce our agreements. Retention periods can differ by data type and service provider.

The current design stores the explicit cloud backup in the user's Google Drive private app-data area, while the app may use browser storage as a local working cache. The app server is not intended to store the supplement backup. Information sent to AI features or Google Calendar is processed by those services. Deleting the app may not delete information already sent to a server, an AI provider, or Google Calendar.

The app does not currently promise a self-service account deletion mechanism in this policy. To request deletion or ask what information may be held about you, contact **[PRIVACY CONTACT EMAIL]**. We may need to verify your request and may retain limited information where legally permitted or required.

## 7. Security

We use technical and organizational measures intended to protect information. No internet transmission or storage system can be guaranteed completely secure. Keep your Google account secure and review the Google permissions you grant to the app.

## 8. Your choices and rights

Depending on your location and applicable law, you may have rights to request access to, correction of, or deletion of personal information, or to object to or restrict certain processing.

You can:
- choose whether to sign in with Google;
- decline or revoke Google Calendar permissions;
- avoid sending optional information to the AI assistant; and
- contact us to ask about access, correction, or deletion.

We will handle requests as required by applicable law.

## 9. Children's privacy

Supple Pulse is not designed for children under 13, and we do not knowingly seek to collect personal information from children under 13. If you believe a child has provided personal information, contact us so we can review the request. Where local law sets a higher age or requires parental consent, those requirements apply.

## 10. International processing

You may use the app from different countries. Service providers may process information in countries other than your own, where privacy protections may differ. We take steps required by applicable law for such transfers.

## 11. Changes to this policy

We may update this policy as the app changes. We will update the "Last updated" date when we publish revisions. If a change materially affects how information is handled, we will provide notice where required by law.

## 12. Contact

For privacy questions or requests, contact:

**Supple Pulse Privacy Contact**  
Email: **[PRIVACY CONTACT EMAIL]**

---

This policy describes the app's intended handling of information and should be checked against the deployed product, data flows, vendor settings, and applicable legal requirements before being presented as final.


## Encrypted Google Drive backups

When a user creates a backup, the app encrypts the backup in the browser using AES-256-GCM before uploading it to Google Drive's private app-data area. A key is derived from a separate user-chosen passphrase using PBKDF2-SHA-256 with a random salt and 310,000 iterations. A fresh random nonce is used for each encryption. The passphrase and derived key are not stored by Supple Pulse or sent to its server. Google sign-in by itself cannot decrypt backup contents. Users must remember the backup passphrase; Supple Pulse cannot recover it. Backups are manual and the app continues to keep working data in local browser storage. This encryption does not protect information a user chooses to send to optional AI features or other connected services.
