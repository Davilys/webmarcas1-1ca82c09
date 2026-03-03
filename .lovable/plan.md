

## Limpeza: Separar Clientes de Leads

### Diagnostico

- A importacao de clientes **NAO** esta criando leads. O edge function `import-clients` so insere em `profiles` e `brand_processes` - confirmado por analise do codigo.
- O problema real: existem **1.744 registros na tabela `leads`** cujo email tambem existe na tabela `profiles` (clientes). Esses leads foram criados pelo formulario do site ("Formulario Site") antes de virarem clientes.
- **Sonia Aparecida Morais** (sam.moraes0@gmail.com) esta corretamente no Kanban de clientes (Juridico > Protocolado) - a correcao anterior funcionou. Porem ela tambem aparece na aba Leads (2 registros duplicados).

### Solucao em 2 partes

#### 1. Limpeza imediata: Excluir leads que ja sao clientes

Executar um DELETE na tabela `leads` para remover todos os registros cujo email ja existe na tabela `profiles`:

```sql
DELETE FROM leads 
WHERE email IN (SELECT email FROM profiles WHERE email IS NOT NULL)
```

Isso remove os **1.744 leads duplicados** de uma vez.

#### 2. Prevencao futura: Limpar leads automaticamente na importacao

Alterar o edge function `import-clients/index.ts` para, apos importar/atualizar um cliente com sucesso, verificar se existe um lead com o mesmo email e exclui-lo automaticamente. Assim, toda vez que um lead vira cliente (via importacao), ele e removido da tabela de leads.

Adicionar ao final da funcao `processClient`:

```text
// Apos importar/atualizar com sucesso:
await supabaseAdmin
  .from('leads')
  .delete()
  .eq('email', email);
```

### Resultado

- 1.744 leads duplicados serao removidos imediatamente
- Importacoes futuras de clientes limpam automaticamente leads com o mesmo email
- Aba Clientes e aba Leads ficam completamente separadas
- Nenhum dado de cliente sera perdido (so leads duplicados sao excluidos)

