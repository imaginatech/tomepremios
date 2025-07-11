import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaggueWebhookPayload {
  hash: string
  external_id: string
  endToEndId?: string
  reference: string
  payer_name: string
  amount: number
  description: string
  status: number // 0 = pending, 1 = paid
  paid_at: string | null
  created_at: string
  expiration_at: string | null
  payment: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Webhook do Paggue recebido');

    const signatureToken = Deno.env.get('PAGGUE_SIGNATURE_TOKEN');
    
    if (!signatureToken) {
      console.error('Token de assinatura não configurado');
      return new Response('Signature token not configured', { status: 500 });
    }

    const body = await req.text();
    
    // Verificar assinatura do webhook (usando HMAC SHA-256)
    const signature = req.headers.get('Signature');
    if (!signature) {
      console.error('Assinatura do webhook não fornecida');
      return new Response('Unauthorized', { status: 401 });
    }

    // Verificar assinatura HMAC
    const encoder = new TextEncoder();
    const keyData = encoder.encode(signatureToken);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const bodyData = encoder.encode(body);
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, bodyData);
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (signature !== computedSignature) {
      console.error('Assinatura inválida:', { received: signature, computed: computedSignature });
      return new Response('Invalid signature', { status: 401 });
    }

    const payload: PaggueWebhookPayload = JSON.parse(body);
    console.log('Payload do webhook:', payload);

    // Inicializar cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Processar apenas pagamentos pagos (status = 1)
    if (payload.status === 1) {
      console.log('Processando pagamento aprovado:', payload.hash);
      
      // Buscar o pagamento no banco de dados pelo hash
      const { data: payment, error: paymentError } = await supabase
        .from('pix_payments')
        .select('*')
        .eq('paggue_transaction_id', payload.hash)
        .single();

      if (paymentError || !payment) {
        console.error('Pagamento não encontrado:', paymentError);
        return new Response('Payment not found', { status: 404, headers: corsHeaders });
      }

      // Atualizar status do pagamento
      const { error: updateError } = await supabase
        .from('pix_payments')
        .update({
          status: 'paid',
          paid_at: payload.paid_at || new Date().toISOString(),
          paggue_webhook_data: payload,
        })
        .eq('id', payment.id);

      if (updateError) {
        console.error('Erro ao atualizar pagamento:', updateError);
        return new Response('Database error', { status: 500, headers: corsHeaders });
      }

      // Reservar os números
      try {
        const { error: reserveError } = await supabase.rpc('reserve_numbers', {
          p_user_id: payment.user_id,
          p_numbers: payment.selected_numbers,
        });

        if (reserveError) {
          console.error('Erro ao reservar números:', reserveError);
          return new Response('Failed to reserve numbers', { status: 500, headers: corsHeaders });
        }

        console.log('Números reservados com sucesso');
      } catch (error) {
        console.error('Erro ao chamar reserve_numbers:', error);
        return new Response('Failed to reserve numbers', { status: 500, headers: corsHeaders });
      }

      // Processar bônus de afiliado se houver código de indicação
      if (payment.user_id) {
        try {
          const response = await supabase.functions.invoke('process-affiliate-bonus', {
            body: { userId: payment.user_id, paymentId: payment.id }
          });
          
          if (response.error) {
            console.error('Erro ao processar bônus de afiliado:', response.error);
          } else {
            console.log('Bônus de afiliado processado com sucesso');
          }
        } catch (error) {
          console.error('Erro ao chamar process-affiliate-bonus:', error);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro no processamento do webhook:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})