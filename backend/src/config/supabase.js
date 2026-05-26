const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'placeholder-key';

// Cliente por defecto (usa el rol anon o service_role si se le pasa)
const supabase = createClient(supabaseUrl, supabaseKey);

// Función para crear un cliente en nombre del usuario, inyectando el token JWT
const createAuthClient = (token) => {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
};

module.exports = { supabase, createAuthClient };
