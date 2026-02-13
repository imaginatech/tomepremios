import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PALPITECO-PAYMENT] ${step}${detailsStr}`);
};

const createSignature = async (payload: string, signatureToken: string): Promise<string> => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(signatureToken), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Iniciando criação de pagamento Palpiteco");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Token de autorização necessário");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Erro de autenticação: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("Usuário não autenticado");

    const { poll_id, selected_option, amount } = await req.json();
    logStep("Dados recebidos", { poll_id, selected_option, amount });

    if (!poll_id || selected_option === undefined || !amount) {
      throw new Error("poll_id, selected_option e amount são obrigatórios");
    }

    // Verificar se a enquete existe e está ativa
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('*')
      .eq('id', poll_id)
      .eq('status', 'active')
      .single();

    if (pollError || !poll) throw new Error("Enquete não encontrada ou não está ativa");

    // Verificar se o usuário já participou desta enquete (com pagamento confirmado)
    const { data: existingEntry } = await supabase
      .from('poll_entries')
      .select('id')
      .eq('poll_id', poll_id)
      .eq('user_id', user.id)
      .eq('payment_status', 'paid')
      .maybeSingle();

    if (existingEntry) throw new Error("Você já participou desta enquete");

    // Buscar secrets da Paggue
    const clientKey = Deno.env.get("PAGGUE_CLIENT_KEY");
    const clientSecret = Deno.env.get("PAGGUE_CLIENT_SECRET");
    const companyId = Deno.env.get("PAGGUE_COMPANY_ID");
    const signatureToken = Deno.env.get("PAGGUE_SIGNATURE_TOKEN");

    if (!clientKey || !clientSecret || !companyId || !signatureToken) {
      throw new Error("Secrets da Paggue não configurados");
    }

    // Autenticar na Paggue
    const paggueAuthResponse = await fetch('https://ms.paggue.io/auth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_key: clientKey, client_secret: clientSecret }),
    });

    if (!paggueAuthResponse.ok) {
      throw new Error(`Erro na autenticação Paggue: ${await paggueAuthResponse.text()}`);
    }

    const { access_token: accessToken } = await paggueAuthResponse.json();

    // Criar cobrança PIX
    const pixPaymentData = {
      payer_name: user.user_metadata?.full_name || "Cliente",
      amount: Math.round(amount * 100),
      external_id: `palpiteco_${poll_id}_${user.id}_${Date.now()}`,
      description: `Palpiteco - ${poll.title}`,
      meta: { user_id: user.id, poll_id, selected_option, type: 'palpiteco' },
    };

    const payloadString = JSON.stringify(pixPaymentData);
    const signature = await createSignature(payloadString, signatureToken);

    const pagguePaymentResponse = await fetch('https://ms.paggue.io/cashin/api/billing_order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Company-ID': companyId,
        'Signature': signature,
      },
      body: payloadString,
    });

    if (!pagguePaymentResponse.ok) {
      throw new Error(`Erro ao criar cobrança: ${await pagguePaymentResponse.text()}`);
    }

    const paymentResult = await pagguePaymentResponse.json();
    logStep("Resposta Paggue", { hash: paymentResult.hash });

    // Salvar pagamento PIX - usar raffle_id do primeiro sorteio ativo ou criar sem
    // Precisamos de um raffle_id para a tabela pix_payments, vamos buscar o ativo
    const { data: activeRaffle } = await supabase
      .from('raffles')
      .select('id')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    const { data: pixPayment, error: insertError } = await supabase
      .from('pix_payments')
      .insert({
        user_id: user.id,
        raffle_id: activeRaffle?.id || '00000000-0000-0000-0000-000000000000',
        selected_numbers: [selected_option],
        amount,
        paggue_transaction_id: paymentResult.hash,
        pix_code: paymentResult.payment,
        status: 'pending',
        expires_at: paymentResult.expiration_at || new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (insertError) throw new Error(`Erro ao salvar pagamento: ${insertError.message}`);

    // Criar entrada na poll_entries como pendente
    const { error: entryError } = await supabase.from('poll_entries').insert({
      poll_id,
      user_id: user.id,
      selected_option,
      payment_status: 'pending',
      pix_payment_id: pixPayment.id,
    });

    if (entryError) logStep("Erro ao criar poll_entry", { error: entryError.message });

    return new Response(JSON.stringify({
      success: true,
      payment: { id: pixPayment.id, pix_code: pixPayment.pix_code, amount: pixPayment.amount },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO", { message: errorMessage });
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
