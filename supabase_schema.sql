-- =========================================================================
-- TradeView V2 - Supabase PostgreSQL Database Schema
-- Run this in your Supabase Project's "SQL Editor" to create the tables & policies
-- =========================================================================

-- 1. Create trades table
CREATE TABLE IF NOT EXISTS public.trades (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    asset_class TEXT NOT NULL,
    direction TEXT NOT NULL,
    status TEXT NOT NULL,
    
    -- Execution timestamps
    entry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    exit_date TIMESTAMP WITH TIME ZONE,
    
    -- Prices & Quantities
    entry_price NUMERIC NOT NULL,
    exit_price NUMERIC,
    quantity NUMERIC NOT NULL,
    stop_loss NUMERIC,
    take_profit NUMERIC,
    fees NUMERIC DEFAULT 0,
    
    -- Calculated P&L and Risk
    gross_pnl NUMERIC DEFAULT 0,
    net_pnl NUMERIC DEFAULT 0,
    pnl_percentage NUMERIC DEFAULT 0,
    r_multiple NUMERIC DEFAULT 0,
    
    -- Qualitative & Patterns (V2)
    strategy TEXT DEFAULT 'Unassigned',
    patterns JSONB DEFAULT '[]'::jsonb,
    behavioral_flags JSONB DEFAULT '[]'::jsonb,
    emotion TEXT DEFAULT 'Disciplined',
    rating INTEGER DEFAULT 0,
    notes TEXT,
    lessons TEXT,
    image_url TEXT,
    
    -- System Audit Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Indexes for blazing fast analytics & pattern queries
CREATE INDEX IF NOT EXISTS idx_trades_entry_date ON public.trades (entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades (symbol);
CREATE INDEX IF NOT EXISTS idx_trades_asset_class ON public.trades (asset_class);
CREATE INDEX IF NOT EXISTS idx_trades_strategy ON public.trades (strategy);
CREATE INDEX IF NOT EXISTS idx_trades_patterns ON public.trades USING GIN (patterns);
CREATE INDEX IF NOT EXISTS idx_trades_behavioral_flags ON public.trades USING GIN (behavioral_flags);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- 4. Create permissive policies for application access (or adapt for Supabase Auth if using login)
CREATE POLICY "Allow public read access on trades" 
ON public.trades FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert on trades" 
ON public.trades FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update on trades" 
ON public.trades FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete on trades" 
ON public.trades FOR DELETE 
USING (true);

-- 5. Realtime subscription support (optional but recommended)
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
