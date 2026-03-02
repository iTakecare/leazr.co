const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';

  return new Response(JSON.stringify({ ip }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
