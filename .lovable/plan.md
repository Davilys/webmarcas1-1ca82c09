

# Editor Inline de Contatos na Ficha do Cliente

## Objetivo
Adicionar um botao "Editar" na aba Contatos que transforma os campos de somente-leitura em inputs editaveis, permitindo completar/corrigir todas as informacoes do cliente (nome, CPF, CNPJ, email, telefone, empresa, endereco, informacoes comerciais).

## Arquivo a modificar
`src/components/admin/clients/ClientDetailSheet.tsx`

## Alteracoes

### 1. Novos estados (junto aos existentes, ~linha 171)
- `editingContacts: boolean` - alterna entre modo leitura e edicao
- `contactForm: object` - dados temporarios (full_name, email, cpf, cnpj, phone, company_name, address, neighborhood, city, state, zip_code, origin, client_funnel_type, assigned_to)
- `savingContacts: boolean` - loading do botao salvar

### 2. Atualizar query do perfil (linha 381)
Adicionar `origin, client_funnel_type, full_name, email, phone` ao SELECT da tabela `profiles`.

### 3. Refatorar aba Contatos (linhas 1672-1701)

**Card Dados Pessoais (linha 1675-1686):**
- Adicionar botao "Editar" no header ao lado de "Dados Pessoais"
- Ao clicar "Editar", o estado `editingContacts` muda para `true` e `contactForm` e populado com os dados atuais
- Em modo edicao: cada InfoRow vira um Input com Label:
  - Nome Completo (input texto)
  - E-mail (input email, disabled pois e login)
  - CPF (input texto)
  - CNPJ (input texto)
  - Telefone (input texto)
  - Empresa (input texto)
- Botoes "Cancelar" e "Salvar" no rodape do card

**Card Endereco (linhas 1688-1698):**
- Sempre visivel em modo edicao (remover condicional `profileData?.address || profileData?.city`)
- Em modo edicao: inputs para Logradouro, Bairro, Cidade, Estado (UF), CEP

**Novo card Informacoes Comerciais (apenas em modo edicao):**
- Select Origem: site, indicacao, google, instagram, facebook, whatsapp, outro
- Select Funil: comercial, juridico
- Select Responsavel: lista dinamica de admins (ja carregada em `adminUsersList`)

### 4. Logica de salvamento
- Update na tabela `profiles` com todos os campos do contactForm
- Atualiza `cpf_cnpj` automaticamente (usa CPF se preenchido, senao CNPJ)
- Apos salvar: `fetchClientData()` + `onUpdate()` para sincronizar
- Toast de sucesso/erro
- Volta ao modo leitura apos salvar

## Seguranca
- Nenhuma tabela ou coluna nova
- Usa apenas colunas ja existentes na tabela `profiles`
- Sem afetar outras abas ou funcionalidades

