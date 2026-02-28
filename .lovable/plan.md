

# Correção de Bugs no ServiceActionPanel

## Problemas Identificados

Dois bugs no arquivo `src/components/admin/clients/ServiceActionPanel.tsx` que impedirão o envio correto de emails:

### Bug 1: Parametro `to` como string em vez de array
- **Linha 161**: `to: client.email` envia uma string
- A Edge Function `send-email` espera `to: string[]` (array)
- **Correcao**: Mudar para `to: [client.email]`

### Bug 2: Propriedade `path` em vez de `url` nos anexos
- **Linha 158**: `{ filename: ..., path: docUrl }` usa `path`
- A interface `EmailAttachment` do `send-email` espera `{ url: string, filename: string }`
- **Correcao**: Mudar para `{ url: docUrl, filename: ... }`

## Arquivo a modificar

`src/components/admin/clients/ServiceActionPanel.tsx` - 2 alteracoes pontuais:

1. Linha 158: Trocar `path` por `url` no objeto de anexo
2. Linha 161: Envolver `client.email` em array `[client.email]`

## Impacto

- Correcoes isoladas, sem afetar nenhum outro fluxo
- Sem alteracao de tabelas ou schemas
- Sem nova dependencia

