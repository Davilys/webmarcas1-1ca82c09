-- Adicionar coluna suggested_classes na tabela contracts (aditiva, nullable)
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS suggested_classes jsonb DEFAULT NULL;

-- Comentário para documentação
COMMENT ON COLUMN public.contracts.suggested_classes IS 'Classes NCL sugeridas pelo laudo de viabilidade que não foram selecionadas pelo cliente. Formato: [{"number": 35, "description": "...", "selected": false}]';