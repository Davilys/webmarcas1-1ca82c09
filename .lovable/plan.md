
# Botao "Agenda" em Detalhes do Processo: Abrir Dialog de Agendamento com Google Meet + Notificacao

## Problema Atual
O botao "Agenda" nas publicacoes dentro de "Detalhes do Processo" chama `handleSchedulePubReminder`, que cria silenciosamente um lembrete simples (sem dialog, sem Google Meet, sem notificacao). O usuario quer que este botao abra o formulario de agendamento completo (como na imagem) e envie o link do Google Meet por email e WhatsApp.

## Solucao

### Arquivo: `src/components/admin/clients/ClientDetailSheet.tsx`

**1. Novo estado para agendamento de publicacao:**
- `schedulingPub`: guarda a publicacao selecionada (ou `null`)
- Quando setado, abre um dialog inline (ou reutiliza a logica do "Novo Agendamento" existente) pre-preenchido com o titulo da publicacao

**2. Substituir `handleSchedulePubReminder` pelo novo fluxo:**
- Em vez de criar um lembrete silencioso, setar `schedulingPub = pub` e abrir o formulario de agendamento
- O formulario ja existe na aba "Agenda" (com campos titulo, descricao, data, hora, duracao, Google Meet toggle) - reutilizar essa UI como Dialog

**3. Criar `handleCreatePubAppointment`:**
- Cria o agendamento em `client_appointments` (mesmo para orfaos, usar admin_id)
- Gera Google Meet via edge function `create-google-meet`
- Apos criar, envia notificacao multicanal (email + whatsapp) com o link do Meet via `send-multichannel-notification`
- Payload da notificacao: titulo da reuniao, data/hora, link do Google Meet, nome da marca

**4. Dialog de agendamento:**
- Abrir como Dialog por cima do sheet (z-index alto)
- Pre-preencher titulo com "Reuniao: [nome da marca/processo]"
- Campos: Titulo, Descricao, Data, Hora, Duracao (select), Google Meet checkbox
- Botao "Criar Agendamento"

**5. Envio de notificacao apos criar:**
- Chamar `send-multichannel-notification` com:
  - `channels: ['email', 'whatsapp']`
  - `event_type: 'agendamento_criado'`
  - `recipient: { nome, email, phone }` (do cliente, se vinculado)
  - `data: { titulo, data_hora, meet_link, marca }`

## Detalhes Tecnicos

```text
Fluxo:
[Clicar "Agenda" na pub] 
  -> Abre Dialog com formulario
  -> Preencher dados + Google Meet ON
  -> "Criar Agendamento"
    -> INSERT client_appointments
    -> invoke create-google-meet
    -> UPDATE appointment com meet_link
    -> invoke send-multichannel-notification (email + whatsapp)
    -> Toast sucesso
```

### Mudancas no codigo:

1. **Novos estados** (~linha 200):
   - `schedulingPub: any | null` - publicacao sendo agendada
   - `schedulingForm: { title, description, date, time, duration, generateMeet }`
   - `savingSchedule: boolean`

2. **Nova funcao `handleCreatePubSchedule`** (~apos linha 800):
   - Insere em `client_appointments` (user_id = client.id ou null para orfaos, admin_id = current user)
   - Invoca `create-google-meet` se toggle ativo
   - Invoca `send-multichannel-notification` com link do Meet
   - Fecha dialog, recarrega dados

3. **Botao "Agenda" na pub** (linha 1243):
   - Mudar de `handleSchedulePubReminder(pub)` para `setSchedulingPub(pub)` + setar form pre-preenchido

4. **Novo Dialog** (apos os dialogs existentes, ~final do JSX):
   - Dialog com z-index 200+
   - Layout identico ao da imagem: Titulo, Descricao, Data+Hora, Duracao+Google Meet, Botao criar
   - Usar mesmos componentes (Input, Textarea, Select)

### Edge function `send-multichannel-notification`:
- Ja existe e suporta email + whatsapp
- Usar `event_type: 'agendamento_criado'` (pode nao ter template - a funcao envia mensagem customizada via `data.mensagem_custom`)

## Resultado Esperado
- Botao "Agenda" abre dialog completo (como na imagem)
- Agendamento criado com Google Meet automatico
- Link do Meet enviado por email e WhatsApp ao cliente (se tiver dados de contato)
- Agendamento aparece na aba "Agenda" do ficheiro
