import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: false,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Telegram error for chat ${chatId}: ${JSON.stringify(err)}`);
  }
}

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
    const groupId = Deno.env.get('TELEGRAM_GROUP_ID'); // optional group

    if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN not configured');
    if (!channelId && !groupId) throw new Error('Neither TELEGRAM_CHANNEL_ID nor TELEGRAM_GROUP_ID is configured');

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

    // Send to all configured destinations (channel + group) in parallel
    const targets: string[] = [];
    if (channelId) targets.push(channelId);
    if (groupId) targets.push(groupId);

    const results = await Promise.allSettled(
      targets.map((chatId) => sendTelegramMessage(botToken, chatId, text))
    );

    const failures = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => r.reason?.message ?? String(r.reason));

    if (failures.length === targets.length) {
      // All failed
      throw new Error(failures.join(' | '));
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent_to: targets.length,
        failures: failures.length > 0 ? failures : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
