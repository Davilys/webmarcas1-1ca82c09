

## Audit: Central de Email — 3 Critical Issues Found

### Problem 1: No Auto-Sync (Manual only)
The `EmailList` query has no `refetchInterval`. Emails only appear after clicking "Sincronizar". Gmail/Outlook update automatically.

**Fix**: Add automatic background IMAP sync every 2 minutes via `refetchInterval` on the email query, plus trigger an IMAP sync on component mount and periodically via a `useEffect` that calls the sync edge function silently.

### Problem 2: Sent Emails Don't Appear in Outlook
Currently, emails are sent via **Resend API** (`noreply@webmarcas.net`), which bypasses the user's SMTP server entirely. The email never touches Outlook, so it never appears in the Sent folder there.

**Fix**: Modify the `send-email` edge function to also send via the user's **SMTP credentials** (from `email_accounts` table) when an `account_id` is provided. This way the email goes through the user's actual mail server and appears in their Outlook Sent folder. Resend remains as fallback for system/automated emails.

### Problem 3: Encoded Subjects Not Decoded
Screenshot shows `=?utf-8?Q?...` MIME-encoded subjects displayed raw. The IMAP sync function (`parseEnvelopeHeaders`) doesn't decode RFC 2047 encoded words.

**Fix**: Add a MIME `=?charset?encoding?text?=` decoder in the sync edge function to properly decode subjects, from-names, and to-names.

---

### Implementation Plan

#### 1. Fix IMAP sync: decode MIME headers
- In `supabase/functions/sync-imap-inbox/index.ts`, add a `decodeMimeWords()` function that handles `=?utf-8?Q?...?=` and `=?utf-8?B?...?=` encoded strings
- Apply it to `subject`, `fromName`, `toName` in `parseEnvelopeHeaders`
- Redeploy the edge function

#### 2. Fix auto-sync in frontend
- In `EmailList.tsx`: add `refetchInterval: 120000` (2 min) to the emails query
- Add a `useEffect` that triggers a silent IMAP sync on mount and every 3 minutes
- In `Emails.tsx`: add `refetchInterval: 120000` to the stats query (already has 60s, keep it)

#### 3. Fix sent emails to go through SMTP
- Modify `send-email` edge function to accept optional `account_id`
- When `account_id` is provided, fetch SMTP credentials from `email_accounts` and send via SMTP (using Deno's `Deno.connectTls` for TLS SMTP)
- Use the user's actual email as the `From` address so it appears in their Outlook
- Pass `account_id` from `EmailCompose.tsx` when sending

#### 4. Database cleanup: fix existing encoded subjects
- Run a migration to decode existing `=?utf-8?Q?...?=` subjects in `email_inbox` table

### Files to modify
- `supabase/functions/sync-imap-inbox/index.ts` — MIME decoder
- `supabase/functions/send-email/index.ts` — SMTP sending support
- `src/components/admin/email/EmailList.tsx` — auto-sync
- `src/components/admin/email/EmailCompose.tsx` — pass account_id to send-email

