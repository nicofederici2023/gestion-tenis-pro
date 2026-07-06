const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Tenis.2026.CAEC@db.zgykjuejkbradfdkjoap.supabase.co:5432/postgres'
});

async function run() {
  try {
    await client.connect();
    
    // Check columns of the expenses table
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'expenses';
    `);
    
    console.log("Expenses Columns:", result.rows);

    // Get a few recent expenses
    const data = await client.query(`
      SELECT id, description, receipt_url 
      FROM expenses 
      ORDER BY created_at DESC 
      LIMIT 10;
    `).catch(err => {
        console.log("receipt_url column doesn't exist, falling back");
        return client.query(`
            SELECT id, description 
            FROM expenses 
            ORDER BY created_at DESC 
            LIMIT 10;
        `);
    });

    console.log("Recent Expenses:");
    data.rows.forEach(r => console.log(r));

  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await client.end();
  }
}

run();
