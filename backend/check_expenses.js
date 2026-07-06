require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.storage.createBucket('receipts', {
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
    fileSizeLimit: 10485760 // 10MB
  });
  console.log("Create Bucket data:", data);
  console.log("Create Bucket error:", error);
}

check();
