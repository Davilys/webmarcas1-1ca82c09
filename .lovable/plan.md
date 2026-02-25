
## Plano: Melhorias na aba Publicacoes

### 1. Kanban como modo padrao
Alterar o estado inicial de `viewMode` de `'lista'` para `'kanban'` em `PublicacaoTab.tsx` (linha 276).

### 2. Busca com autocomplete ao lado de "Publicacoes"
Adicionar um campo de busca com autocomplete ao lado do titulo "Publicacoes" na barra superior (linha ~1201). O campo permite digitar nome do cliente, marca ou numero de processo. Ao digitar, exibe uma lista suspensa com resultados filtrados (clientes e processos). Ao selecionar um cliente, filtra o Kanban pelo `client_id` selecionado. Implementacao com `Command` (cmdk) usando `shouldFilter={false}` e debounce de 400ms, seguindo o padrao existente no projeto.

### 3. Ficha do cliente ao clicar no card do Kanban
Substituir o painel lateral de detalhes atual por um `Sheet` (ficheiro) que replica a estrutura do `ClientDetailSheet` existente na aba Clientes:
- Mesmas abas e funcoes (dados do cliente, notas, agenda, documentos, financeiro, marcas)
- Adicionar botao "Detalhes do Processo" dentro da ficha que, ao clicar, abre os detalhes do processo (timeline, alertas, RPI, historico) exatamente como o painel lateral atual de publicacoes
- Reutilizar o componente `ClientDetailSheet` importando-o e passando o cliente selecionado, ou criar uma versao adaptada que inclua o botao extra

### 4. Renomear "Gerar Lembrete" para "Agenda"
Na linha 1441 de `PublicacaoTab.tsx`, alterar o texto do botao de "Gerar Lembrete" para "Agenda" e trocar o icone de `Bell` para `Calendar`.

### 5. Campo de busca textual para vincular cliente no dialog de edicao
No dialog de edicao (linha 1619-1628), substituir o `Select` de cliente por um campo de busca com autocomplete usando `Command` (cmdk). O usuario digita o nome, email ou CPF/CNPJ e seleciona da lista filtrada. Mesmo padrao de `shouldFilter={false}` com busca no servidor e debounce.

### Detalhes tecnicos

**Arquivos modificados:**
- `src/components/admin/PublicacaoTab.tsx` - Todas as alteracoes principais (modo padrao, busca, ficha, rename, autocomplete)
- `src/components/admin/publicacao/PublicacaoKanban.tsx` - Ajustar callback do `onSelect` para passar dados completos do cliente

**Componentes reutilizados:**
- `ClientDetailSheet` da aba Clientes (importado diretamente ou adaptado)
- `Command/CommandInput/CommandList` do cmdk para autocomplete
- Padrao `ClientWithProcess` existente para montar os dados do cliente

**Fluxo do autocomplete de busca:**
1. Usuario digita no campo de busca
2. Debounce de 400ms filtra `clients` localmente por nome/email/cpf
3. Lista suspensa mostra ate 10 resultados
4. Ao selecionar, define `filterClient` com o ID selecionado
5. Kanban filtra automaticamente

**Fluxo da ficha do cliente no Kanban:**
1. Usuario clica no card
2. Abre `Sheet` com dados do cliente (reutilizando `ClientDetailSheet`)
3. Dentro da ficha, botao "Detalhes do Processo" abre um sub-dialog com timeline, alertas e historico da publicacao (conteudo atual do painel lateral)
