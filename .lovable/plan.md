

# Atribuir Cliente no Ficheiro Azul (Publicacoes Orfas)

## Problema
Quando uma publicacao nao tem cliente vinculado, o ficheiro azul abre mostrando "Sem cliente vinculado" na aba Contatos com dados vazios. Nao existe forma de atribuir um cliente real a essa publicacao/processo diretamente pelo ficheiro.

## Solucao
Adicionar na aba Contatos do ClientDetailSheet, quando `client.id === ''` (sem cliente vinculado), um campo de busca com autocomplete para pesquisar clientes por nome, email ou CPF/CNPJ e vincular ao processo/publicacao.

---

## Detalhes Tecnicos

### Arquivo: `src/components/admin/clients/ClientDetailSheet.tsx`

**1. Novos estados:**
- `linkClientSearch`: texto digitado na busca
- `linkClientResults`: array de resultados da busca (profiles)
- `linkingClient`: loading state durante vinculacao
- `debouncedLinkSearch`: debounce de 400ms no texto

**2. Busca com debounce:**
- Quando `linkClientSearch` tem 2+ caracteres, buscar na tabela `profiles` com `or(full_name.ilike, email.ilike, cpf.ilike, cnpj.ilike)` limitado a 10 resultados
- Usar `useEffect` com `setTimeout` de 400ms

**3. Funcao `handleLinkClient(profileId)`:**
- Atualizar `publicacoes_marcas.client_id = profileId` (usando `process_id` do client atual)
- Atualizar `brand_processes.user_id = profileId` (se houver `process_id`)
- Chamar `onUpdate()` para recarregar dados
- Fechar o sheet e reabrir com o cliente correto (ou simplesmente chamar `onUpdate` + `toast.success`)

**4. UI na aba Contatos:**
- Condicionar: se `client.id === ''`, mostrar um card com:
  - Icone + titulo "Vincular Cliente"
  - Input de busca com placeholder "Pesquisar por nome, email ou CPF/CNPJ..."
  - Lista de resultados abaixo do input com nome, email e botao "Vincular"
  - Manter o card "Dados Pessoais" existente abaixo (mostrando dados vazios) oculto quando nao ha cliente
- Se `client.id !== ''`, manter o layout atual

**5. Apos vincular:**
- Toast de sucesso "Cliente vinculado com sucesso!"
- Chamar `onUpdate()` para recarregar a lista de publicacoes
- Fechar o sheet (o usuario pode reabrir e vera os dados do cliente correto)

### Resultado
- Cards orfaos no Kanban de Publicacoes agora permitem atribuir cliente real pelo ficheiro azul
- Busca por digitacao com autocomplete (nome, email, CPF/CNPJ)
- Vinculacao atualiza tanto `publicacoes_marcas.client_id` quanto `brand_processes.user_id`
