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

// Função para validar signature conforme documentação Paggue
const validateSignature = async (signature: string, body: any, signingSecret: string): Promise<boolean> => {
  try {
    const jsonString = jsonStringifyUnicode(body);
    logStep("JSON string para validação", { jsonString: jsonString.substring(0, 200) + "..." });
    
    // Implementar HMAC SHA256 conforme documentação Paggue
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(signingSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBytes = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(jsonString)
    );
    
    const computedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    logStep("Validação de signature", { 
      received: signature.substring(0, 20) + "...",
      computed: computedSignature.substring(0, 20) + "...",
      receivedLength: signature.length,
      computedLength: computedSignature.length
    });
    
    return signature.toLowerCase() === computedSignature.toLowerCase();
  } catch (error) {
    logStep("Erro na validação de signature", { error: error.message });
    return false;
  }
};

// Função para stringify com unicode conforme documentação
const jsonStringifyUnicode = (obj: any): string => {
  return JSON.stringify(obj).replace(/[\u0080-\uFFFF]/g, function (char) {
    return "\\u" + ("0000" + char.charCodeAt(0).toString(16)).slice(-4);
  });
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook recebido da Paggue");
    
    // Log todos os headers para debug
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    logStep("Headers recebidos", headers);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const webhookData = await req.json();
    logStep("Dados do webhook completos", webhookData);

    // Verificar signature conforme documentação Paggue
    const signature = req.headers.get('Signature');
    const signatureToken = Deno.env.get("PAGGUE_SIGNATURE_TOKEN");
    
    if (signatureToken && signature) {
      logStep("Validando signature da Paggue");
      const isValid = await validateSignature(signature, webhookData, signatureToken);
      if (!isValid) {
        logStep("ERRO: Signature inválida", { signature: signature.substring(0, 20) + "..." });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        });
      }
      logStep("Signature validada com sucesso");
    } else {
      logStep("AVISO: Signature não fornecida ou token não configurado");
    }

    // Verificar se é um pagamento aprovado (status = 1 conforme documentação)
    if (webhookData.status !== 1) {
      logStep("Evento ignorado - pagamento não aprovado", { 
        status: webhookData.status,
        hash: webhookData.hash,
        external_id: webhookData.external_id 
      });
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Usar hash ou external_id para identificar a transação conforme documentação
    const transactionId = webhookData.hash || webhookData.external_id;
    if (!transactionId) {
      throw new Error("Hash ou external_id não encontrado no webhook");
    }

    logStep("Processando pagamento aprovado", { 
      transactionId,
      hash: webhookData.hash,
      external_id: webhookData.external_id,
      amount: webhookData.amount,
      payer_name: webhookData.payer_name
    });

    // Buscar o pagamento no banco usando hash como identificador
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