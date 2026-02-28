
# Engrenagem de Configuracao no Kanban Admin (Clientes)

## Objetivo

Adicionar um botao de engrenagem (configuracao) ao Kanban da pagina Admin > Clientes, permitindo:
- Criar novas etapas do Kanban
- Editar nome de etapas existentes
- Arrastar etapas para reordenar (drag-and-drop)
- Remover etapas
- Escolher cor de cada etapa

## Localizacao

O botao de engrenagem ficara na area entre os filtros de data e os cards de resumo (Total / Valor / Ativos), exatamente onde o circulo preto foi marcado na imagem. Ficara ao lado esquerdo dos stats, visivel apenas no modo Kanban.

## Arquivos a criar/modificar

### 1. Novo componente: `src/components/admin/clients/AdminKanbanConfig.tsx`

Dialog de configuracao com:
- Campo para adicionar nova etapa (nome + cor)
- Lista de etapas com `framer-motion` `Reorder.Group` para drag-and-drop vertical
- Cada etapa tera: grip handle, campo editavel (icone lapis), seletor de cor (swatches), botao remover
- Salvamento automatico na tabela `system_settings` com chaves separadas:
  - `admin_kanban_comercial_stages` para o funil comercial
  - `admin_kanban_juridico_stages` para o funil juridico

### 2. Modificar: `src/components/admin/clients/ClientKanbanBoard.tsx`

- Adicionar prop `onConfigOpen` (callback para abrir dialog de configuracao)
- Carregar etapas dinamicamente da `system_settings` em vez de usar arrays hardcoded
- Fallback para as etapas hardcoded atuais (COMMERCIAL_PIPELINE_STAGES / PIPELINE_STAGES) quando nao houver configuracao salva
- Manter compatibilidade com cores e estilos existentes

### 3. Modificar: `src/pages/admin/Clientes.tsx`

- Adicionar botao de engrenagem (Settings2) na area indicada pelo usuario
- Importar e renderizar o `AdminKanbanConfig` dialog
- Passar o tipo de funil ativo (comercial/juridico) ao dialog
- Recarregar etapas ao salvar configuracao

## Detalhes Tecnicos

### Persistencia
- Tabela: `system_settings`
- Chaves: `admin_kanban_comercial_stages` e `admin_kanban_juridico_stages`
- Formato JSON:
```text
{
  "stages": [
    {
      "id": "protocolado",
      "label": "PROTOCOLADO",
      "color": "from-blue-500 to-blue-600",
      "borderColor": "border-blue-500",
      "bgColor": "bg-blue-50 dark:bg-blue-950/30",
      "textColor": "text-blue-700 dark:text-blue-300",
      "description": "Pedido de registro enviado ao INPI."
    }
  ]
}
```

### RLS
- A policy SELECT para usuarios autenticados ja foi criada na migracao anterior
- Admins ja possuem policies de INSERT/UPDATE na `system_settings`

### Componente AdminKanbanConfig
- Reutiliza o mesmo padrao do `ClientKanbanConfig` (framer-motion Reorder)
- Adiciona campos extras: label, description, e seletor de gradiente de cor
- Paleta de cores pre-definida com gradientes Tailwind (blue, emerald, teal, yellow, orange, red, purple, cyan, gray, pink)
- Ao adicionar nova etapa, gera automaticamente as classes de cor baseadas na cor escolhida

### Fluxo do usuario
1. Admin acessa `/admin/clientes` e ativa o modo Kanban
2. Ve o botao de engrenagem na area entre filtros e stats
3. Clica na engrenagem - abre dialog de configuracao
4. Pode adicionar, editar nome, arrastar para reordenar, ou remover etapas
5. Alteracoes sao salvas automaticamente
6. Ao fechar o dialog, o Kanban recarrega com as novas etapas

### Migracao SQL
Nao e necessaria nova migracao - a policy SELECT ja existe e as chaves serao criadas automaticamente via upsert no primeiro uso.
