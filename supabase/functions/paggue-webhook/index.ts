import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAGGUE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook recebido da Paggue");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verificar signature (se necessário)
    const signature = req.headers.get('X-Paggue-Signature');
    const signatureToken = Deno.env.get("PAGGUE_SIGNATURE_TOKEN");
    
    if (signatureToken && signature) {
      // Aqui você pode implementar a verificação da assinatura
      // Por enquanto vamos apenas logar
      logStep("Signature recebida", { signature: signature.substring(0, 20) + "..." });
    }

    const webhookData = await req.json();
    logStep("Dados do webhook", webhookData);

    // Verificar se é um evento de pagamento aprovado da Paggue
    // A Paggue envia: { "event": "billing_order.paid", "data": { "hash": "...", "status": 1 } }
    const eventType = webhookData.event;
    const eventData = webhookData.data;
    
    if (eventType !== 'billing_order.paid' && eventData?.status !== 1) {
      logStep("Evento ignorado", { event: eventType, status: eventData?.status, fullData: webhookData });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const transactionId = eventData?.hash || webhookData.hash;
    if (!transactionId) {
      throw new Error("ID da transação não encontrado no webhook");
    }

    logStep("Processando pagamento aprovado", { transactionId });

    // Buscar o pagamento no banco
    const { data: pixPayment, error: paymentError } = await supabase
      .from('pix_payments')
      .select('*')
      .eq('paggue_transaction_id', transactionId)
      .single();

    if (paymentError || !pixPayment) {
      throw new Error(`Pagamento não encontrado: ${paymentError?.message}`);
    }

    logStep("Pagamento encontrado", { 
      paymentId: pixPayment.id, 
      userId: pixPayment.user_id,
      selectedNumbers: pixPayment.selected_numbers 
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
        paggue_webhook_data: webhookData
      })
      .eq('id', pixPayment.id);

    if (updateError) {
      throw new Error(`Erro ao atualizar pagamento: ${updateError.message}`);
    }

    logStep("Status do pagamento atualizado para 'paid'");

    // Criar os tickets da rifa
    const ticketsToInsert = pixPayment.selected_numbers.map((number: number) => ({
      user_id: pixPayment.user_id,
      raffle_id: pixPayment.raffle_id,
      ticket_number: number,
      payment_status: 'paid'
    }));

    const { error: ticketsError } = await supabase
      .from('raffle_tickets')
      .insert(ticketsToInsert);

    if (ticketsError) {
      logStep("ERRO ao criar tickets", { error: ticketsError.message });
      // Reverter status do pagamento se falhou ao criar tickets
      await supabase
        .from('pix_payments')
        .update({ status: 'error' })
        .eq('id', pixPayment.id);
      
      throw new Error(`Erro ao criar tickets: ${ticketsError.message}`);
    }

    logStep("Tickets criados com sucesso", { 
      count: ticketsToInsert.length, 
      numbers: pixPayment.selected_numbers 
    });

    // Os triggers de afiliados serão executados automaticamente
    // quando os tickets forem inseridos com payment_status='paid'

    return new Response(JSON.stringify({ 
      received: true, 
      processed: true,
      payment_id: pixPayment.id,
      tickets_created: ticketsToInsert.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO no webhook", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      received: true, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});