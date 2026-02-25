

## Plano: Paginas de Politica de Privacidade e Termos de Uso

### O que sera feito

Criar duas paginas estaticas com conteudo juridico adaptado para a WebMarcas Intelligence PI e atualizar os links no Footer que atualmente apontam para `#`.

### 1. Criar pagina `src/pages/PoliticaPrivacidade.tsx`

Pagina com layout consistente (Header + Footer) contendo:
- Titulo "Politica de Privacidade"
- Secoes: Introducao, Dados Coletados, Uso dos Dados, Compartilhamento, Cookies, Seguranca, Direitos do Usuario (LGPD), Contato, Atualizacoes
- Conteudo adaptado para servicos de registro de marcas e propriedade intelectual
- Data de ultima atualizacao

### 2. Criar pagina `src/pages/TermosUso.tsx`

Pagina com layout consistente (Header + Footer) contendo:
- Titulo "Termos de Uso"
- Secoes: Aceitacao, Descricao dos Servicos, Cadastro e Conta, Obrigacoes do Usuario, Pagamentos e Reembolsos, Propriedade Intelectual, Limitacao de Responsabilidade, Rescisao, Lei Aplicavel, Contato
- Conteudo adaptado para a WebMarcas Intelligence PI

### 3. Registrar rotas em `src/App.tsx`

Adicionar:
- `/politica-de-privacidade` -> `PoliticaPrivacidade`
- `/termos-de-uso` -> `TermosUso`

### 4. Atualizar links no `src/components/layout/Footer.tsx`

Trocar os links de `#` para as rotas reais:
- "Politica de Privacidade" -> `/politica-de-privacidade`
- "Termos de Uso" -> `/termos-de-uso`

Usar `<Link>` do React Router em vez de `<a>`.

### Detalhes tecnicos

- Ambas as paginas seguem o padrao do `Index.tsx` (Header + main + Footer)
- Conteudo em portugues como idioma principal
- Estilizacao com classes Tailwind existentes (`prose`, `text-muted-foreground`, etc.)
- Scroll to top ao navegar para as paginas
- Dados de contato da empresa: ola@webmarcas.net, (11) 91112-0225, Sao Paulo - SP
- Referencia a LGPD (Lei Geral de Protecao de Dados)

