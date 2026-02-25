
# Plano: Botoes "Detalhes do Processo" e "Nova Fatura" no Ficheiro do Cliente

## Resumo
Adicionar dois novos botoes na barra de acoes rapidas do ClientDetailSheet (ficheiro do cliente):
1. **Detalhes do Processo** - Exibe os detalhes do processo (timeline, alertas, historico) da aba Publicacao, **dentro do proprio ficheiro** (sem abrir um novo sheet).
2. **Nova Fatura** - Abre o dialogo de criacao de fatura (igual ao da aba Financeiro), ja pre-preenchido com os dados do cliente atribuido ao ficheiro.

Tambem corrigir o comportamento na aba Publicacao para que "Detalhes do Processo" abra dentro do ficheiro principal e nao em um novo sheet.

---

## Detalhes Tecnicos

### 1. Botao "Detalhes do Processo" no ClientDetailSheet

**Arquivo:** `src/components/admin/clients/ClientDetailSheet.tsx`

- Adicionar ao array `QUICK_ACTIONS` (linha ~550) dois novos botoes apos "Excluir":
  - `{ id: 'processo', label: 'Detalhes do Processo', icon: FileText, cls: '...' }`
  - `{ id: 'nova_fatura', label: 'Nova Fatura', icon: Receipt, cls: '...' }`

- Criar um novo estado `showProcessDetails` (boolean) para controlar a visualizacao inline dos detalhes do processo dentro do ficheiro.

- No `handleQuickAction`, adicionar case `'processo'`:
  - Buscar as publicacoes do cliente (`publicacoes_marcas` onde `client_id = client.id`) e os process_events vinculados.
  - Setar `showProcessDetails = true` para renderizar a view de detalhes inline.

- Renderizar a view de detalhes do processo **dentro do proprio sheet** (substituindo temporariamente o conteudo das tabs, similar ao padrao ja usado com `showEmailCompose`):
  - Botao "Voltar ao ficheiro" no topo.
  - Exibir: nome da marca, numero do processo, status da publicacao, timeline (Depositada, Publicada, Oposicao, Deferida, Certificada), alertas programados, historico de alteracoes, documentos RPI, comentarios internos.
  - Reutilizar a mesma estrutura visual do painel lateral "Detalhes do Processo" da aba Publicacao (linhas 1468-1653 do PublicacaoTab.tsx).

### 2. Botao "Nova Fatura" no ClientDetailSheet

**Arquivo:** `src/components/admin/clients/ClientDetailSheet.tsx`

- Adicionar estado `showNewInvoiceDialog` (boolean).

- No `handleQuickAction`, adicionar case `'nova_fatura'`:
  - Abrir um Dialog com o formulario de criacao de fatura.
  - Pre-preencher: `user_id` com o `client.id`, buscar processos do cliente, popular o campo de cliente automaticamente.

- Extrair a logica do formulario de fatura do `Financeiro.tsx` (linhas 270-455) em um componente reutilizavel `CreateInvoiceDialog` ou replicar diretamente no ClientDetailSheet:
  - Selecao de metodo de pagamento (PIX, Boleto, Cartao).
  - Tipo (a vista / parcelado) e numero de parcelas.
  - Descricao, valor, vencimento.
  - Chamar a Edge Function `create-admin-invoice` com os dados.
  - Exibir resultado (QR Code PIX, link da fatura).

- O cliente ja vem selecionado e o campo de busca de cliente fica desabilitado/preenchido.

### 3. Correcao na Aba Publicacao (PublicacaoTab)

**Arquivo:** `src/components/admin/PublicacaoTab.tsx`

- Atualmente, ao clicar em "Detalhes do Processo" no card do Kanban, o sistema abre o `ClientDetailSheet`. O comportamento deve permanecer assim (abrir dentro do ficheiro do cliente), mas garantir que o painel de detalhes do processo apareca **dentro** do sheet e nao em um painel separado.

- Adicionar na `ClientDetailSheet` (quando aberta via Publicacao) a prop ou logica para exibir automaticamente os detalhes do processo se solicitado.

### 4. Botao "Nova Fatura" tambem na Aba Publicacao

**Arquivo:** `src/components/admin/PublicacaoTab.tsx`

- Na secao de botoes de acao do painel de detalhes (linhas 1559-1588), adicionar um botao "Nova Fatura" que abre o mesmo dialogo de criacao de fatura, pre-preenchido com o `client_id` da publicacao selecionada.

---

## Arquivos Modificados

| Arquivo | Alteracao |
|---|---|
| `src/components/admin/clients/ClientDetailSheet.tsx` | Adicionar botoes "Detalhes do Processo" e "Nova Fatura", view inline de detalhes, dialogo de fatura |
| `src/components/admin/PublicacaoTab.tsx` | Adicionar botao "Nova Fatura" no painel de detalhes |

## Notas
- Nenhuma tabela sera criada ou alterada no banco de dados.
- As Edge Functions existentes (`create-admin-invoice`) serao reutilizadas.
- O padrao visual segue o mesmo do ficheiro existente (inline views como EmailCompose).
