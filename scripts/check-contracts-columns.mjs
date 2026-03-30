import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://cifbetjefyfocafanlhv.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU',{auth:{persistSession:false}});
const {data} = await sb.from('contracts').select('*').eq('company_id','c1ce66bb-3ad2-474d-b477-583baa7ff1c0').limit(1);
if (data && data[0]) console.log('Colonnes:', Object.keys(data[0]).join('\n'));
