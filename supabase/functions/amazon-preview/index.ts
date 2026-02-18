const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) return new Response(JSON.stringify({ error: 'URL required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Best-effort Amazon product data extraction via Open Graph / meta tags
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CRMBot/1.0)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });

    const html = await res.text();

    const extract = (pattern: RegExp) => {
      const m = html.match(pattern);
      return m ? m[1].trim() : null;
    };

    const title =
      extract(/<span id="productTitle"[^>]*>([^<]+)</) ||
      extract(/<meta property="og:title" content="([^"]+)"/) ||
      extract(/<title>([^<]+)<\/title>/);

    const image =
      extract(/"large":"(https:\/\/[^"]+\.(jpg|jpeg|png|webp))"/) ||
      extract(/<meta property="og:image" content="([^"]+)"/) ||
      null;

    // Extract ASIN from URL
    const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    const asin = asinMatch ? asinMatch[1] : null;

    // Extract country from domain
    const countryMap: Record<string, string> = {
      'amazon.es': 'ES', 'amazon.de': 'DE', 'amazon.fr': 'FR',
      'amazon.it': 'IT', 'amazon.co.uk': 'UK',
    };
    const domainMatch = url.match(/amazon\.([a-z.]+)/);
    const country = domainMatch ? (countryMap[`amazon.${domainMatch[1]}`] ?? null) : null;

    // Extract price
    const priceMatch = html.match(/["']priceAmount["']\s*:\s*["']?([\d.]+)/) ||
                       html.match(/<span[^>]*class="[^"]*a-price-whole[^"]*"[^>]*>([\d,]+)/);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : null;

    return new Response(
      JSON.stringify({ title, asin, country, price, image }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Preview failed', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
