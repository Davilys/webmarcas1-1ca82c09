

## Plano: Exportar Clientes para CRM Compatível (CSV separado por vírgula)

### Problema
O sistema atual de exportação usa headers em português traduzido (ex: "Nome Completo", "E-mail") e não inclui dados cruciais como `brand_name`, `pipeline_stage`, `client_funnel_type`, `neighborhood`, `cpf`, `cnpj`. O objetivo é gerar um arquivo que funcione perfeitamente ao ser importado em uma instância idêntica do sistema.

### Solução
Criar um novo botão **"Exportar para CRM"** na página de Clientes que gera um CSV com:
- Headers usando os nomes exatos que o `clientParser.ts` reconhece como aliases (ex: `full_name`, `email`, `phone`, `brand_name`)
- Todos os dados possíveis: perfil completo + marca + fase do pipeline + tipo de funil
- Separador vírgula (padrão CSV universal, compatível com o parser existente)
- Clientes de **ambos os funis** (comercial e jurídico) em um único arquivo
- Deduplicação por perfil (um registro por marca/processo)

### Dados exportados por registro
| Campo | Origem |
|-------|--------|
| `full_name`, `email`, `phone`, `company_name` | profiles |
| `cpf_cnpj`, `address`, `city`, `state`, `zip_code` | profiles |
| `neighborhood` | profiles |
| `origin`, `priority`, `contract_value` | profiles |
| `brand_name` | brand_processes |
| `pipeline_stage` | brand_processes |
| `client_funnel_type` | profiles |
| `created_at` | profiles |

### Alterações

**1. `src/lib/clientExporter.ts`** — Nova função `exportToCRMCSV`
- Aceita `ClientWithProcess[]` (dados já carregados na página)
- Gera CSV com vírgula, headers em snake_case compatíveis com o auto-mapper
- Busca dados adicionais (`neighborhood`, `cpf`, `cnpj`, `address`) diretamente do banco para completar os campos que não estão no fetch principal

**2. `src/pages/admin/Clientes.tsx`** — Novo botão "Exportar CRM"
- Botão com ícone `Download` ao lado do botão "Importar"
- Ao clicar, busca dados completos dos perfis (todos os campos) + brand_processes
- Gera o CSV de ambos os funis (comercial + jurídico) com todos os clientes do sistema
- Sem necessidade de dialog — exportação direta

### Compatibilidade com importação
O `clientParser.ts` já mapeia automaticamente estes aliases:
- `full_name` → Nome Completo ✓
- `email` → E-mail ✓  
- `phone` → Telefone ✓
- `brand_name` / `marca` → Marca ✓
- `cpf_cnpj` → CPF/CNPJ ✓

O `import-clients` edge function aceita exatamente esses campos e faz upsert inteligente (busca por email → CPF → CNPJ → nome).

