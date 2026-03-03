

## Plan: Track and Display "Already Sent" Status per Service Stage

### Problem
When an admin opens a client's "Serviços" tab and clicks a service stage to send a notification + billing, there's no indication if it was already sent. This risks duplicate sends.

### Solution
Query `client_activities` for entries with `activity_type = 'notificacao_cobranca'` matching the client and stage. Display a visual indicator on each service button showing it was already sent, plus the date. The ServiceActionPanel will also show a warning if re-sending.

### Technical Changes

**1. `ClientDetailSheet.tsx` — Load sent history and display badges**
- On the Serviços tab, query `client_activities` where `user_id = client.id` and `activity_type = 'notificacao_cobranca'` to get all previously sent stages
- Parse `metadata.stage_id` from each activity to build a map of `stageId → { sent_at, description }`
- On each service stage button, if already sent:
  - Show a green checkmark badge with "Enviado" and the date (e.g., "Enviado em 01/03/2026")
  - Change the button's visual style to indicate completion (subtle green border/background)
- The button still remains clickable (admin can re-send if needed), but the indicator prevents accidental duplicates

**2. `ServiceActionPanel.tsx` — Show warning on re-send**
- Accept new prop `alreadySent?: { sent_at: string; description: string } | null`
- If `alreadySent` is truthy, display a yellow warning banner at the top: "Esta notificação já foi enviada em [date]. Deseja enviar novamente?"
- Keep the send button functional but change label to "Reenviar Notificação + Cobrança"

### Visual Result
Each service type button will show:
- **Not sent**: Normal appearance (current behavior)
- **Already sent**: Green "✓ Enviado em DD/MM/AAAA" badge next to the stage label, subtle green tint on the button

No database changes needed — uses existing `client_activities` table data.

