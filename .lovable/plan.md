

## Analise e Correcao: Notificacao de link do contrato

### Resultado da Analise

| Fluxo | Gera link? | Envia notificacao? | Status |
|-------|-----------|-------------------|--------|
| Admin "Novo Contrato" com "Enviar link" marcado | Sim | Sim (email + WhatsApp + SMS + CRM) | OK |
| Admin "Novo Contrato" sem "Enviar link" (template padrao) | Sim | Sim (CRM + SMS + WhatsApp via generate-signature-link) | OK |
| Site /registrar (formulario do cliente) | NAO | NAO | PROBLEMA |

### Problema encontrado

Quando o cliente preenche o formulario em `/registrar`, a funcao `create-asaas-payment` cria o contrato, o lead, a fatura e dispara o email `form_completed`, mas **nunca gera o link de assinatura** e portanto **nunca envia a notificacao com o link do contrato**.

O cliente recebe o email de "formulario preenchido" mas nao recebe o link para assinar o contrato.

### Solucao

Adicionar um **STEP 7.5** na funcao `create-asaas-payment` (entre o step 7 e 8) que:

1. Chama `generate-signature-link` para gerar o token de assinatura do contrato
2. A propria funcao `generate-signature-link` ja dispara automaticamente a notificacao multicanal (`link_assinatura_gerado`) via CRM + SMS + WhatsApp
3. Em seguida chama `send-signature-request` para enviar o email formal com o link

### Arquivo a editar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/create-asaas-payment/index.ts` | Adicionar chamada a `generate-signature-link` + `send-signature-request` apos criar o contrato (entre linhas 1085-1086) |

### Detalhes tecnicos

Apos o bloco do STEP 7 (trigger form_completed), adicionar:

```text
// STEP 7.5: Generate signature link and send notification
if (contractData?.id) {
  try {
    // Generate signature link (also triggers CRM + SMS + WhatsApp notification)
    const linkRes = await fetch(`${SUPABASE_URL}/functions/v1/generate-signature-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        contractId: contractData.id,
        expiresInDays: 7,
        baseUrl: 'https://webmarcas.net',
      }),
    });
    const linkData = await linkRes.json();
    console.log('Generated signature link:', linkData?.data?.url);

    // Send formal email with signature link
    if (linkData?.success) {
      await fetch(`${SUPABASE_URL}/functions/v1/send-signature-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          contractId: contractData.id,
          channels: ['email'],
          baseUrl: 'https://webmarcas.net',
          overrideContact: {
            email: personalData.email,
            phone: personalData.phone || '',
            name: personalData.fullName,
          },
        }),
      });
      console.log('Sent signature request email');
    }
  } catch (linkError) {
    console.error('Error generating/sending signature link:', linkError);
  }
}
```

### Resultado esperado

Apos a correcao, o fluxo do formulario `/registrar` ficara:
1. Cria lead, contrato, fatura (ja funciona)
2. Envia email `form_completed` (ja funciona)
3. **NOVO**: Gera link de assinatura e envia notificacao automatica (CRM + SMS + WhatsApp + Email)

### Seguranca

- Nenhuma tabela alterada
- Nenhum schema modificado
- Nenhum fluxo existente quebrado
- Apenas adiciona uma chamada extra apos a criacao do contrato
- Usa funcoes que ja existem e ja foram testadas

