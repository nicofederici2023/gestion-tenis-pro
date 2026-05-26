-- Tabla: profiles (usuarios)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: groups (viajes, cenas, eventos)
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'ARS',
  budget_cents BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
);

-- Tabla: group_members (participantes de cada grupo)
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, profile_id)
);

-- Tabla: expenses (gastos registrados)
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  paid_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: expense_shares (división de cada gasto)
CREATE TABLE expense_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL DEFAULT 'split',
  -- share_type: 'paid' (quien pagó), 'split' (comparte), 'excluded' (no participa)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(expense_id, profile_id)
);

-- Tabla: balances (quién debe a quién)
CREATE TABLE balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  debtor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creditor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, debtor_id, creditor_id)
);
