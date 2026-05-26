const { supabase } = require('../config/supabase');

const signup = async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    
    // 1. Crear usuario en Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    // 2. Insertar en tabla profiles (si no usamos triggers)
    // Supabase auth hook / trigger es mejor, pero lo hacemos acá para asegurar
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: data.user.id,
          email,
          full_name
        }]);
      
      if (profileError && profileError.code !== '23505') { // Ignorar duplicados si hay trigger
        console.error('Error creating profile:', profileError);
      }
    }

    res.status(201).json({ message: 'User created successfully', user: data.user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await supabase.auth.signOut(token);
    }
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { signup, login, logout, getMe };
