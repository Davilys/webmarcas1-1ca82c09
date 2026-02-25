

## Nova Aba "Marcas" na Ficha do Cliente

### O que sera feito

Adicionar uma nova aba **"Marcas"** ao lado do botao "Financeiro" na ficha de detalhes do cliente (`ClientDetailSheet`). Essa aba vai listar **todas as marcas registradas** pelo cliente com seus dados completos (nome da marca, ramo de atividade, numero de protocolo INPI, fase do pipeline, etc.).

### Alteracoes

#### Arquivo: `src/components/admin/clients/ClientDetailSheet.tsx`

**1. Buscar todas as marcas do cliente**

No `fetchClientData`, adicionar uma query para buscar todos os `brand_processes` do cliente:

```text
const brandsRes = await supabase
  .from('brand_processes')
  .select('id, brand_name, business_area, process_number, pipeline_stage, status, created_at, updated_at, ncl_classes')
  .eq('user_id', client.id)
  .order('created_at', { ascending: false });
```

Armazenar em um novo state `clientBrands`.

**2. Adicionar a aba "Marcas" na lista de tabs (linha 669)**

Adicionar entre "Financeiro" e o final da lista:

```text
{ value: 'brands', label: 'Marcas', icon: Tag },
```

A ordem ficara: Geral | Contatos | Servicos | Agenda | Anexos | Financeiro | **Marcas**

**3. Criar o conteudo da aba "Marcas" (apos o TabsContent "financial")**

Cada marca sera exibida como um card individual contendo:
- Nome da marca (destaque)
- Ramo de atividade
- Numero do protocolo INPI (se existir)
- Fase atual no pipeline (com badge colorido)
- Data de criacao
- Classes NCL (se existirem)

Quando nao houver marcas, exibir o EmptyState com icone de Tag.

**4. Remover "Dados da Marca" da aba Contatos (linhas 872-883)**

A secao "Dados da Marca" que aparece na aba Contatos sera removida, ja que agora todas as marcas ficam na aba dedicada. Isso evita duplicidade e confusao quando o cliente tem varias marcas.

**5. Tambem usar o campo `brands` do ClientWithProcess**

Se o cliente ja tiver o campo `brands` populado (vindo do agrupamento do Kanban), usar como fallback caso a query direta falhe.

### Seguranca

- Nenhuma tabela alterada
- Nenhum schema modificado  
- Nenhuma Edge Function alterada
- Apenas alteracao visual no frontend (1 arquivo)
- A aba Contatos continua funcionando normalmente sem a secao de marca
- Nenhum fluxo existente e quebrado

### Resultado esperado

- Nova aba "Marcas" visivel na ficha do cliente
- Todas as marcas registradas aparecem como cards individuais com dados completos
- A aba "Contatos" fica limpa, mostrando apenas dados pessoais e endereco
- Clientes com multiplas marcas podem ver todas de forma organizada

