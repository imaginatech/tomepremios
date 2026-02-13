

# Plano: Novo Jogo "Palpiteco" + Pagina Inicial com Cards de Jogos

## Visao Geral

Transformar a pagina inicial em um hub de jogos com cards para cada jogo (Tome Premios e Palpiteco), e criar todo o sistema do Palpiteco: enquetes com opcoes de resposta, pagamento via PIX de R$5, e gerenciamento administrativo.

## Estrutura das Mudancas

### 1. Nova Tabela no Banco de Dados

**Tabela `polls` (Enquetes do Palpiteco)**
- `id` (uuid, PK)
- `title` (text) - Pergunta da enquete (ex: "Quem ganha o classico de domingo?")
- `options` (jsonb) - Array de opcoes (ex: `[{"label": "Time de Casa"}, {"label": "Time Visitante"}]`)
- `winning_option` (integer, nullable) - Indice da opcao vencedora (preenchido quando encerrada)
- `prize_amount` (numeric) - Premio estimado
- `entry_price` (numeric, default 5.00) - Valor de participacao
- `status` (text, default 'active') - active, closed, completed
- `category` (text, nullable) - Categoria (Esportes, Famosos, etc.)
- `created_at`, `updated_at`

**Tabela `poll_entries` (Participacoes)**
- `id` (uuid, PK)
- `poll_id` (uuid, FK -> polls)
- `user_id` (uuid)
- `selected_option` (integer) - Indice da opcao escolhida
- `payment_status` (text, default 'pending') - pending, paid
- `pix_payment_id` (uuid, nullable, FK -> pix_payments)
- `created_at`

**Politicas RLS:**
- Qualquer um pode ver enquetes ativas
- Usuarios autenticados podem ver suas proprias participacoes
- Admins podem gerenciar tudo

### 2. Pagina Inicial - Hub de Jogos

Reformular `Index.tsx` para exibir:
- Hero banner (mantido)
- Secao de **Cards de Jogos** com 2 cards:
  - **Tome Premios** - Loteria com 12 dezenas (rota `/tome-premios`)
  - **Palpiteco** - Enquetes de palpites (rota `/palpiteco`)
- Secao Winners e HowItWorks movidas para as paginas individuais dos jogos

### 3. Novas Paginas

**`/tome-premios`** - Pagina dedicada ao jogo atual da loteria
- Contem: RaffleSelector, Winners, HowItWorks, Header, Footer

**`/palpiteco`** - Pagina do Palpiteco
- Filtros por categoria (Todos, Esportes, Famosos)
- Grid de cards de enquetes (conforme imagem de referencia)
- Cada card mostra: titulo, badge de status, premio estimado, opcoes com radio buttons, botao "PARTICIPAR POR R$5"
- Modal de pagamento PIX ao selecionar opcao

### 4. Painel Administrativo - Gestao do Palpiteco

Nova aba "Palpiteco" no admin com:
- Listagem de enquetes cadastradas
- Formulario para criar/editar enquete (titulo, opcoes, premio, categoria)
- Botao para definir opcao vencedora e encerrar enquete
- Visualizacao de participacoes por enquete

### 5. Edge Function para Pagamento do Palpiteco

**`create-palpiteco-payment`** - Similar ao `create-pix-payment` existente, mas:
- Recebe `poll_id` e `selected_option`
- Cria registro em `poll_entries`
- Gera cobranca PIX via Paggue
- Webhook existente (`paggue-webhook`) sera ajustado para processar pagamentos do Palpiteco tambem

---

## Detalhes Tecnicos

### Arquivos a Criar
- `src/pages/TomePremios.tsx` - Pagina do jogo Tome Premios
- `src/pages/Palpiteco.tsx` - Pagina do jogo Palpiteco
- `src/components/GameCards.tsx` - Cards de jogos na home
- `src/components/palpiteco/PollCard.tsx` - Card individual de enquete
- `src/components/palpiteco/PollList.tsx` - Lista de enquetes com filtros
- `src/components/palpiteco/PalpitecoPaymentModal.tsx` - Modal de pagamento
- `src/components/admin/PalpitecoManagement.tsx` - Gestao no admin
- `supabase/functions/create-palpiteco-payment/index.ts` - Edge function de pagamento

### Arquivos a Modificar
- `src/pages/Index.tsx` - Simplificar para hub de jogos
- `src/App.tsx` - Adicionar novas rotas
- `src/pages/Admin.tsx` - Adicionar aba Palpiteco
- `supabase/functions/paggue-webhook/index.ts` - Processar pagamentos do Palpiteco
- `supabase/config.toml` - Registrar nova edge function

### Migracoes SQL
- Criar tabelas `polls` e `poll_entries`
- Adicionar RLS policies
- Trigger para atualizar `updated_at`

