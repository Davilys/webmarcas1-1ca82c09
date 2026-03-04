

## Plan: Add Documents to Lifecycle Timeline

The `documents` state is already loaded from the database (line 181, fetched at line 424). The lifecycle events section (lines 1244-1329) already handles contracts, invoices, process events, brand protocols, and notification activities — but not standalone documents from the "Anexos" tab.

### Change: `src/components/admin/clients/ClientDetailSheet.tsx`

After the `processActivities.forEach` block (after line 1329), add a new block that loops through `documents` and creates "Anexo Enviado" lifecycle events:

```typescript
// Documents from Anexos tab
documents.forEach((doc: any) => {
  lifecycleEvents.push({
    date: doc.created_at,
    label: 'Anexo Enviado',
    description: doc.name || 'Documento',
    icon: Paperclip,
    status: 'completed',
    category: 'notificacao',
  });
});
```

This will deduplicate naturally with the notification-attached documents since those come from `meta.document_urls` (extracted from activity metadata), while these come from the `documents` table directly. To avoid duplicates, we'll check if the document URL already exists in the events added from `processActivities`.

The approach:
1. Collect all document URLs already added from notification metadata into a Set
2. Loop through `documents` state, skip any whose `file_url` is already in that Set
3. Add remaining as "Anexo Enviado" events with filename, date, and time

This ensures all attachments appear in the lifecycle — whether uploaded directly via Anexos or sent via notification — without duplication.

