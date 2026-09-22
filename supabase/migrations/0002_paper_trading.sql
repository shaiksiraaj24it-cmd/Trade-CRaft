-- ============================================================================
-- Paper Trading Schema Migration
-- ============================================================================

-- Add market column to stocks if not exists
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stocks' and column_name = 'market'
  ) then
    alter table public.stocks add column market text not null default 'NSE/BSE';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- portfolios
-- Virtual balance per user
-- ---------------------------------------------------------------------------
create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  virtual_cash numeric not null default 100000.00 check (virtual_cash >= 0),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

drop trigger if exists trg_portfolios_updated on public.portfolios;
create trigger trg_portfolios_updated before update on public.portfolios
  for each row execute function public.set_updated_date();

alter table public.portfolios enable row level security;

drop policy if exists "portfolios_select" on public.portfolios;
create policy "portfolios_select" on public.portfolios for select using (user_id = auth.uid());

drop policy if exists "portfolios_insert" on public.portfolios;
create policy "portfolios_insert" on public.portfolios for insert with check (user_id = auth.uid());

drop policy if exists "portfolios_update" on public.portfolios;
create policy "portfolios_update" on public.portfolios for update using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- holdings
-- Stocks held by a user's portfolio
-- ---------------------------------------------------------------------------
create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  stock_id uuid not null references public.stocks(id) on delete cascade,
  symbol text not null,
  shares numeric not null check (shares >= 0),
  average_buy_price numeric not null check (average_buy_price >= 0),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  unique (portfolio_id, stock_id)
);

drop trigger if exists trg_holdings_updated on public.holdings;
create trigger trg_holdings_updated before update on public.holdings
  for each row execute function public.set_updated_date();

alter table public.holdings enable row level security;

drop policy if exists "holdings_select" on public.holdings;
create policy "holdings_select" on public.holdings for select
  using (portfolio_id in (select id from public.portfolios where user_id = auth.uid()));

drop policy if exists "holdings_insert" on public.holdings;
create policy "holdings_insert" on public.holdings for insert
  with check (portfolio_id in (select id from public.portfolios where user_id = auth.uid()));

drop policy if exists "holdings_update" on public.holdings;
create policy "holdings_update" on public.holdings for update
  using (portfolio_id in (select id from public.portfolios where user_id = auth.uid()));

drop policy if exists "holdings_delete" on public.holdings;
create policy "holdings_delete" on public.holdings for delete
  using (portfolio_id in (select id from public.portfolios where user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- transactions
-- Trade log for buys/sells
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stock_id uuid references public.stocks(id) on delete set null,
  symbol text not null,
  type text not null check (type in ('BUY', 'SELL')),
  shares numeric not null check (shares > 0),
  price numeric not null check (price >= 0),
  total_amount numeric not null,
  created_date timestamptz not null default now()
);

alter table public.transactions enable row level security;

drop policy if exists "transactions_select" on public.transactions;
create policy "transactions_select" on public.transactions for select using (user_id = auth.uid());

drop policy if exists "transactions_insert" on public.transactions;
create policy "transactions_insert" on public.transactions for insert with check (user_id = auth.uid());
