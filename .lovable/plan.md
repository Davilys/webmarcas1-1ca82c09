

## Correções no ContractStep - Classes Sugeridas

### Bug 1: Classe some ao ser selecionada

**Causa raiz**: O bloco de upsell (linha 224) filtra apenas classes NAO selecionadas:
```typescript
const unselected = (suggestedClasses || []).filter(
  cls => !(selectedClasses || []).includes(cls)
);
if (unselected.length === 0) return null; // some tudo quando seleciona todas
```

E o checkbox esta hardcoded `checked={false}`.

**Correcao**: Mostrar TODAS as classes sugeridas que NAO estavam na selecao original do BrandDataStep. Ao selecionar, a classe continua visivel com checkbox marcado (checked=true) e destaque visual verde.

Logica:
- Calcular `originalSelected` = classes que ja vinham selecionadas do BrandDataStep (nao mostrar essas)
- Mostrar todas as classes sugeridas que NAO estavam no original
- O `checked` do checkbox reflete se a classe esta em `selectedClasses` atual
- Classes marcadas ganham borda verde e fundo verde claro
- Classes desmarcadas mantem o visual amber atual

### Bug 2: Texto sem persuasao juridica

**Correcao**: Substituir titulo e descricao por texto com orientacao juridica persuasiva:

- Titulo: "⚖️ Orientacao Juridica" (com icone Scale do lucide)
- Subtitulo em destaque: "O ideal e registrar nas X classes para maxima protecao."
- Texto explicativo: "Sem o registro nestas categorias, terceiros podem usar sua marca legalmente nestes segmentos. A protecao parcial deixa sua marca vulneravel."

### Arquivo a editar

`src/components/cliente/checkout/ContractStep.tsx`:

1. Trocar o filtro de `unselected` para mostrar todas as sugeridas que nao estavam na selecao original
2. Checkbox com `checked` dinamico baseado em `selectedClasses.includes(cls)`
3. Estilo condicional: verde quando selecionado, amber quando nao
4. Nao esconder o bloco quando todas estiverem selecionadas (manter visivel com todas marcadas)
5. Novo texto persuasivo com tom juridico
6. Importar icone `Scale` do lucide-react

### Detalhes tecnicos

Para saber quais classes sao "extras" (sugeridas mas nao selecionadas originalmente no BrandDataStep), precisamos comparar `suggestedClasses` com as classes que ja vieram selecionadas. Como o componente recebe `selectedClasses` atualizado reativamente, vamos filtrar as classes sugeridas que NAO faziam parte da selecao inicial. Para isso, mostraremos todas as `suggestedClasses` que nao estavam na lista original — usando a diferenca entre `suggestedClasses` e as classes que o usuario ja escolheu no passo anterior.

Na pratica, a abordagem mais simples e robusta: mostrar TODAS as classes de `suggestedClasses` no bloco, com checkbox marcado/desmarcado conforme `selectedClasses`. As classes que ja estavam selecionadas desde o BrandDataStep aparecerao marcadas e o cliente pode desmarcar se quiser. Isso da controle total.

Porem, para nao confundir com as classes "obrigatorias", vamos filtrar apenas as que NAO estao na selecao inicial. Para isso, guardaremos a selecao inicial com `useRef` no mount.

