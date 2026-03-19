import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MERCADOPAGO-WEBHOOK] ${step}${detailsStr}`);
};

// Validar assinatura do Mercado Pago
// Formato do header x-signature: ts=<timestamp>,v1=<hmac>
const validateSignature = async (
  xSignature: string,
  xRequestId: string,
  dataId: string,
  secret: string
): Promise<boolean> => {
  try {
    const parts = xSignature.split(',');
    const tsPart = parts.find(p => p.startsWith('ts='));
    const v1Part = parts.find(p => p.startsWith('v1='));
    if (!tsPart || !v1Part) return false;

    const ts = tsPart.split('=')[1];
    const receivedHash = v1Part.split('=')[1];

    // Mensagem para validação conforme documentação do Mercado Pago
    const message = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBytes = await crypto.subtle.sign(
      'HMAC', key, new TextEncoder().encode(message)
    );

    const computedHash = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    logStep("Validação de assinatura", {
      received: receivedHash.substring(0, 20) + '...',
      computed: computedHash.substring(0, 20) + '...',
    });

    return receivedHash === computedHash;
  } catch (err) {
    logStep("Erro na validação de assinatura", { error: err.message });
    return false;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook recebido do Mercado Pago");

    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => { headers[key] = value; });
    logStep("Headers recebidos", headers);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const webhookBody = await req.json();
    logStep("Body do webhook", webhookBody);

    // Validar assinatura se o secret estiver configurado
    const webhookSecret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");
    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id') ?? '';
    const dataId = webhookBody?.data?.id ? String(webhookBody.data.id) : '';

    if (webhookSecret && xSignature && dataId) {
      logStep("Validando assinatura do Mercado Pago");
      const isValid = await validateSignature(xSignature, xRequestId, dataId, webhookSecret);
      if (!isValid) {
        logStep("ERRO: Assinatura inválida");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        });
      }
      logStep("Assinatura validada com sucesso");
    } else {
      logStep("AVISO: Assinatura não validada (secret ou headers ausentes)");
    }

    // Ignorar eventos que não sejam de pagamento
    if (webhookBody.type !== 'payment') {
      logStep("Evento ignorado - não é do tipo payment", { type: webhookBody.type });
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const mpPaymentId = dataId;
    if (!mpPaymentId) throw new Error("ID do pagamento não encontrado no webhook");

    // Buscar detalhes do pagamento na API do MP para confirmar aprovação
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!mpResponse.ok) {
      throw new Error(`Erro ao buscar pagamento no MP: ${await mpResponse.text()}`);
    }

    const mpPayment = await mpResponse.json();
    logStep("Detalhes do pagamento MP", { id: mpPayment.id, status: mpPayment.status });

    // Só processar pagamentos aprovados
    if (mpPayment.status !== 'approved') {
      logStep("Pagamento não aprovado - ignorando", { status: mpPayment.status });
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Buscar o pagamento no banco pelo mp_payment_id
    const { data: pixPayment, error: paymentError } = await supabase
      .from('pix_payments')
      .select('*')
      .eq('mp_payment_id', String(mpPaymentId))
      .single();

    if (paymentError || !pixPayment) {
      throw new Error(`Pagamento não encontrado no banco: ${paymentError?.message}`);
    }

    logStep("Pagamento encontrado no banco", {
      paymentId: pixPayment.id,
      userId: pixPayment.user_id,
    });

    // Verificar se já foi processado
    if (pixPayment.status === 'paid') {
      logStep("Pagamento já processado", { paymentId: pixPayment.id });
      return new Response(JSON.stringify({ received: true, already_processed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Atualizar status do pagamento
    const { error: updateError } = await supabase
      .from('pix_payments')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        mp_webhook_data: mpPayment,
      })
      .eq('id', pixPayment.id);

    if (updateError) throw new Error(`Erro ao atualizar pagamento: ${updateError.message}`);

    logStep("Status do pagamento atualizado para 'paid'");

    // Verificar se é pagamento do Palpiteco
    const isPalpiteco = (mpPayment.external_reference || '').startsWith('palpiteco_');

    if (isPalpiteco) {
      const { error: entryError } = await supabase
        .from('poll_entries')
        .update({ payment_status: 'paid' })
        .eq('pix_payment_id', pixPayment.id);

      if (entryError) {
        logStep("ERRO ao atualizar poll_entry", { error: entryError.message });
      } else {
        logStep("Poll entry atualizado para paid");
      }
    } else {
      // Criar aposta no sorteio
      const { error: ticketsError } = await supabase
        .from('raffle_bets')
        .insert({
          raffle_id: pixPayment.raffle_id,
          user_id: pixPayment.user_id,
          numbers: pixPayment.selected_numbers,
          status: 'paid',
        });

      if (ticketsError) {
        logStep("ERRO ao criar aposta", { error: ticketsError.message });
        await supabase.from('pix_payments').update({ status: 'error' }).eq('id', pixPayment.id);
        throw new Error(`Erro ao criar aposta: ${ticketsError.message}`);
      }

      logStep("Aposta criada com sucesso", { numbers: pixPayment.selected_numbers });
    }

    return new Response(JSON.stringify({
      received: true,
      processed: true,
      payment_id: pixPayment.id,
      type: isPalpiteco ? 'palpiteco' : 'raffle',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO no webhook", { message: errorMessage });
    return new Response(JSON.stringify({ received: true, error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
