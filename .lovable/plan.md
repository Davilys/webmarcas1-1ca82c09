

## Correção: Links de verificação blockchain no email

### Problema

Dois pontos usam URLs incorretas, causando 404:

1. `sign-contract-blockchain/index.ts` linha 248: fallback é `webmarcas.lovable.app` (domínio antigo)
2. `confirm-payment/index.ts` linhas 260-268: não inclui `verification_url` nem `link_area_cliente` no payload do email

### Solução

Usar o mesmo padrão já adotado em `generate-signature-link`, `send-signature-request` e `trigger-email-automation`: domínio fixo `https://webmarcas.net` como PRODUCTION_DOMAIN, com proteção contra URLs de preview.

### Alterações

| Arquivo | O que muda |
|---------|-----------|
| `sign-contract-blockchain/index.ts` | Linha 248: trocar fallback de `webmarcas.lovable.app` para `webmarcas.net`, com validação anti-preview |
| `confirm-payment/index.ts` | Adicionar `verification_url` e `link_area_cliente` no payload do email contract_signed, buscando o `blockchain_hash` do contrato |

### Detalhes técnicos

**sign-contract-blockchain (linha 248)**

```text
Antes:
  const verificationBaseUrl = baseUrl || Deno.env.get('SITE_URL') || 'https://webmarcas.lovable.app';

Depois:
  const PRODUCTION_DOMAIN = 'https://webmarcas.net';
  const isPreviewUrl = (url: string) =>
    !url || url.includes('lovable.app') || url.includes('localhost');
  const rawSiteUrl = Deno.env.get('SITE_URL') || '';
  const verificationBaseUrl = (!isPreviewUrl(rawSiteUrl) ? rawSiteUrl : null)
    || (!isPreviewUrl(baseUrl || '') ? baseUrl : null)
    || PRODUCTION_DOMAIN;
```

Isso segue exatamente o padrão das outras funções (generate-signature-link, send-signature-request).

**confirm-payment (linhas 249-269)**

Antes de disparar o email, buscar o `blockchain_hash` do contrato e incluir os links:

```text
// Buscar blockchain_hash do contrato
let blockchainHash = '';
if (contractId) {
  const { data: contractRecord } = await supabaseAdmin
    .from('contracts')
    .select('blockchain_hash')
    .eq('id', contractId)
    .maybeSingle();
  blockchainHash = contractRecord?.blockchain_hash || '';
}

// No payload do email, adicionar:
const PRODUCTION_DOMAIN = 'https://webmarcas.net';
data: {
  ...campos existentes...,
  verification_url: blockchainHash
    ? `${PRODUCTION_DOMAIN}/verificar-contrato?hash=${blockchainHash}`
    : '',
  link_area_cliente: `${PRODUCTION_DOMAIN}/cliente/documentos`,
}
```

### Segurança

- Nenhuma tabela alterada
- Nenhum schema modificado
- Nenhum fluxo existente quebrado
- Apenas URLs nos emails corrigidas para apontar ao domínio correto (webmarcas.net)
- Deploy automático das edge functions após edição

