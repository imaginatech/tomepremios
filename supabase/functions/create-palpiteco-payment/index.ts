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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Iniciando criação de pagamento Palpiteco via Mercado Pago");

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

    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('*')
      .eq('id', poll_id)
      .eq('status', 'active')
      .single();

    if (pollError || !poll) throw new Error("Enquete não encontrada ou não está ativa");

    const { data: existingEntry } = await supabase
      .from('poll_entries')
      .select('id')
      .eq('poll_id', poll_id)
      .eq('user_id', user.id)
      .eq('payment_status', 'paid')
      .maybeSingle();

    if (existingEntry) throw new Error("Você já participou desta enquete");

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");

    const externalReference = `palpiteco_${poll_id}_${user.id}_${Date.now()}`;
    const mpPaymentData = {
      transaction_amount: amount,
      description: `Palpiteco - ${poll.title}`,
      payment_method_id: "pix",
      payer: {
        email: user.email || "pagador@tomepremios.com.br",
        first_name: user.user_metadata?.full_name?.split(' ')[0] || "Cliente",
        last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || "Tome Prêmios",
      },
      external_reference: externalReference,
      metadata: {
        user_id: user.id,
        poll_id,
        selected_option,
        type: 'palpiteco',
      },
      date_of_expiration: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };

    logStep("Criando pagamento no Mercado Pago", { external_reference: externalReference });

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Idempotency-Key': externalReference,
      },
      body: JSON.stringify(mpPaymentData),
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      throw new Error(`Erro ao criar pagamento no Mercado Pago: ${errorText}`);
    }

    const mpResult = await mpResponse.json();
    logStep("Resposta do Mercado Pago", { id: mpResult.id, status: mpResult.status });

    const pixCode = mpResult.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = mpResult.point_of_interaction?.transaction_data?.qr_code_base64;
    const mpPaymentId = String(mpResult.id);

    if (!pixCode) throw new Error("Código PIX não retornado pelo Mercado Pago");

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
        mp_payment_id: mpPaymentId,
        pix_code: pixCode,
        qr_code_image: qrCodeBase64 ? `data:image/png;base64,${qrCodeBase64}` : null,
        status: 'pending',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (insertError) throw new Error(`Erro ao salvar pagamento: ${insertError.message}`);

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
      payment: {
        id: pixPayment.id,
        pix_code: pixPayment.pix_code,
        qr_code_image: pixPayment.qr_code_image,
        amount: pixPayment.amount,
      },
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
