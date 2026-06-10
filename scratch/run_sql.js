const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Tenis.2026.CAEC@db.zgykjuejkbradfdkjoap.supabase.co:5432/postgres'
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    const query = `
      CREATE TABLE IF NOT EXISTS public.push_subscriptions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
          subscription JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Acceso total para autenticados" ON public.push_subscriptions;
      CREATE POLICY "Acceso total para autenticados" ON public.push_subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
    `;
    
    await client.query(query);
    console.log('Table push_subscriptions created successfully with RLS');
  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await client.end();
  }
}

run();
