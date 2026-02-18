import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { product_id } = await req.json();
    if (!product_id) throw new Error('product_id required');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .single();

    if (error || !product) throw new Error('Product not found');

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const channelId = Deno.env.get('TELEGRAM_CHANNEL_ID');

    if (!botToken || !channelId) throw new Error('Telegram credentials not configured');

    const text = [
      `🛍️ *${product.title}*`,
      product.asin ? `📦 ASIN: \`${product.asin}\`` : null,
      product.marketplace_country ? `🌍 Market: *${product.marketplace_country}*` : null,
      product.price_eur ? `💶 Price: *€${product.price_eur}*` : null,
      product.commission_eur ? `💰 Commission: *€${product.commission_eur}*` : null,
      product.total_qty ? `📊 Qty: *${product.total_qty}*` : null,
      product.daily_limit ? `⏱️ Daily limit: *${product.daily_limit}*` : null,
      product.amazon_url ? `\n🔗 [View on Amazon](${product.amazon_url})` : null,
    ].filter(Boolean).join('\n');

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    });

    if (!tgRes.ok) {
      const tgErr = await tgRes.json();
      throw new Error(`Telegram error: ${JSON.stringify(tgErr)}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
