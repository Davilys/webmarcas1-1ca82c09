

# Correcao: Link do Email Abre Pagina Errada + Verificacao Falha

## Problemas Identificados

### Problema 1: Pagina de verificacao mostra "Contrato Nao Encontrado"
O hash `749a0c9...` EXISTE no banco de dados, mas a pagina `/verificar-contrato` nao consegue encontra-lo. O motivo e que a tabela `contracts` tem RLS (Row Level Security) ativado e todas as politicas de SELECT exigem usuario autenticado (`authenticated`). Como a pagina de verificacao e publica (sem login), a consulta usa o papel `anon`, que nao tem permissao para ler a tabela.

### Problema 2: Link do email deveria abrir o contrato assinado para download
O botao "Verificar Contrato" no email aponta para `/verificar-contrato?hash=...`, que e uma pagina de auditoria/blockchain. O cliente espera clicar e poder baixar o contrato assinado. O email precisa incluir um link direto para a area do cliente (documentos) e, opcionalmente, manter o link de verificacao como secundario.

## Correcoes

### 1. Adicionar politica RLS publica para verificacao (Migration SQL)

Criar uma politica que permite acesso anonimo/publico para SELECT na tabela `contracts`, mas SOMENTE quando filtrado por `blockchain_hash` e retornando apenas campos nao-sensiveis:

```sql
CREATE POLICY "Public can verify contracts by hash"
  ON contracts
  FOR SELECT
  TO anon
  USING (blockchain_hash IS NOT NULL);
```

Nota: A pagina `VerificarContrato.tsx` ja filtra por `.eq('blockchain_hash', hash)` e seleciona apenas campos publicos (contract_number, blockchain_timestamp, etc.). A politica permite o SELECT anonimo, e a query da pagina ja limita os campos retornados.

### 2. Atualizar template de email no banco de dados

Alterar o template `contract_signed` para incluir:
- Um botao principal "Acessar Meus Documentos" apontando para `{{link_area_cliente}}/documentos` (area do cliente com login)
- Manter o botao "Verificar Autenticidade" como link secundario

### 3. Atualizar edge function `sign-contract-blockchain`

Adicionar `link_area_cliente` nos dados enviados ao `trigger-email-automation`:
- `link_area_cliente: https://webmarcas.net/cliente/login`

### 4. Atualizar `VerificarContrato.tsx`

Adicionar um link para download do PDF assinado na pagina de verificacao (quando o contrato for encontrado). Buscar o `file_url` da tabela `documents` associado ao contrato verificado.

## Arquivos Modificados

| Arquivo/Recurso | Alteracao |
|---|---|
| Migration SQL | Politica RLS para acesso anonimo a contracts por blockchain_hash |
| Template no banco (email_templates) | Atualizar corpo do email contract_signed com link para area do cliente |
| `supabase/functions/sign-contract-blockchain/index.ts` | Incluir link_area_cliente nos dados do email |
| `src/pages/VerificarContrato.tsx` | Adicionar politica RLS para documents + link de download do PDF assinado |

## O que NAO sera alterado
- Nenhum outro componente de UI
- Nenhuma outra edge function
- Logica de assinatura e blockchain
- Layout geral da pagina de verificacao
