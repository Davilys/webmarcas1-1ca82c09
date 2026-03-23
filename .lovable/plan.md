
Objetivo: eliminar a instabilidade intermitente de “Failed to fetch” no painel administrativo e tornar o app resiliente quando a conexão oscila.

Achados da auditoria (já confirmados):
1) A instabilidade não é constante no backend: há chamadas com status 200 no mesmo período.
2) O erro aparece principalmente no ciclo de autenticação/renovação de sessão no cliente (falha de rede transitória).
3) Há muitos pontos com chamadas assíncronas sem tratamento uniforme de timeout/retry.
4) O Dashboard dispara várias consultas em paralelo; quando há microqueda, surgem várias falhas ao mesmo tempo.
5) Em alguns fluxos de validação de admin, se houver falha de rede no momento crítico, a UI pode ficar em estado inconsistente (ex.: verificação eterna ou mensagem genérica).

Plano de implementação:
1) Padronizar resiliência de rede (camada única)
- Criar utilitário compartilhado para: timeout, retry com backoff, classificação de erro de conectividade e cancelamento seguro.
- Reaproveitar essa camada em login, validação de permissões e consultas críticas.
- Arquivos-alvo: novo util em `src/lib/*` + adoção em `src/pages/admin/Login.tsx`, `src/components/admin/AdminLayout.tsx`, `src/hooks/useAdminPermissions.ts`.

2) Fortalecer bootstrap de autenticação/admin
- Refatorar verificação inicial do admin para fluxo robusto com fallback e estado de erro recuperável (botão “tentar novamente” sem travar tela).
- Evitar spinner infinito quando a rede oscila.
- Garantir que apenas erro definitivo de permissão bloqueie acesso; erro transitório vira estado de reconexão.

3) Reduzir explosão de requisições simultâneas no Dashboard
- Colocar tratamento de erro consistente em todos os widgets (sem promise rejeitada “solta”).
- Introduzir retry controlado e janela de refetch mais estável (evitar tempestade de requisições em foco/reconexão).
- Arquivos-alvo: `src/pages/admin/Dashboard.tsx` e componentes em `src/components/admin/dashboard/*`.

4) Unificar chamadas a funções de backend feitas via `fetch`
- Substituir padrões diretos por invocação padronizada com timeout/retry e mensagens de erro amigáveis.
- Priorizar pontos de alto uso: contratos, criação de cobrança, assinatura e envios.
- Arquivos-alvo iniciais: `src/components/admin/contracts/*`, `src/pages/admin/RevistaINPI.tsx`, `src/pages/AssinarDocumento.tsx`.

5) Observabilidade e validação final
- Adicionar logs técnicos mínimos (somente dev) com causa classificada: timeout, offline, rede instável, permissão.
- Validar em cenário real: login admin, abertura do dashboard, navegação entre módulos, reconexão após queda curta.

Testes de aceite (obrigatórios):
1) Login admin com rede normal e com oscilação (sem travar em “Verificando…”).
2) Dashboard abre sem “explosão” de erros no console durante reconexão.
3) Após queda rápida de internet e retorno, sessão volta sem exigir múltiplos logins.
4) Fluxos críticos (contratos/cobrança/assinatura) mostram erro claro e recuperam no retry.

Detalhes técnicos (resumo):
- Sem alteração de banco de dados.
- Sem mexer em `src/integrations/supabase/client.ts` (arquivo gerado).
- Foco em hardening de frontend: auth bootstrap, retries centralizados, controle de concorrência e tratamento de erro por módulo.
