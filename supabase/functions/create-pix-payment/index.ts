import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PIX-PAYMENT] ${step}${detailsStr}`);
};

// Função para criar assinatura SHA256
const createSignature = async (payload: string, signatureToken: string): Promise<string> => {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(signatureToken);
  const messageData = encoder.encode(payload);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Iniciando criação de pagamento PIX");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Token de autorização necessário");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Erro de autenticação: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.id) throw new Error("Usuário não autenticado");
    logStep("Usuário autenticado", { userId: user.id });

    // Dados da requisição
    const { selectedNumbers, amount } = await req.json();
    logStep("Dados recebidos", { selectedNumbers, amount });

    if (!selectedNumbers?.length || !amount) {
      throw new Error("Números selecionados e valor são obrigatórios");
    }

    // Buscar sorteio ativo
    const { data: raffle, error: raffleError } = await supabase
      .from('raffles')
      .select('id')
      .eq('status', 'active')
      .single();

    if (raffleError || !raffle) {
      throw new Error("Nenhum sorteio ativo encontrado");
    }
    logStep("Sorteio ativo encontrado", { raffleId: raffle.id });

    // Verificar se números ainda estão disponíveis
    const { data: existingTickets, error: ticketsError } = await supabase
      .from('raffle_tickets')
      .select('ticket_number')
      .eq('raffle_id', raffle.id)
      .in('ticket_number', selectedNumbers)
      .eq('payment_status', 'paid');

    if (ticketsError) {
      throw new Error(`Erro ao verificar números: ${ticketsError.message}`);
    }

    if (existingTickets && existingTickets.length > 0) {
      const unavailableNumbers = existingTickets.map(t => t.ticket_number);
      throw new Error(`Números já vendidos: ${unavailableNumbers.join(', ')}`);
    }

    // Verificar se secrets estão configurados
    const clientKey = Deno.env.get("PAGGUE_CLIENT_KEY");
    const clientSecret = Deno.env.get("PAGGUE_CLIENT_SECRET");
    const companyId = Deno.env.get("PAGGUE_COMPANY_ID");
    const signatureToken = Deno.env.get("PAGGUE_SIGNATURE_TOKEN");
    
    logStep("Verificando secrets", { 
      hasClientKey: !!clientKey, 
      hasClientSecret: !!clientSecret,
      hasCompanyId: !!companyId,
      hasSignatureToken: !!signatureToken
    });
    
    if (!clientKey || !clientSecret || !companyId || !signatureToken) {
      throw new Error("Secrets da Paggue não configurados. Verifique PAGGUE_CLIENT_KEY, PAGGUE_CLIENT_SECRET, PAGGUE_COMPANY_ID e PAGGUE_SIGNATURE_TOKEN");
    }

    // Autenticar na API da Paggue
    const authPayload = {
      client_key: clientKey,
      client_secret: clientSecret
    };
    
    logStep("Autenticando na Paggue", { client_key: clientKey });
    
    const paggueAuthResponse = await fetch('https://ms.paggue.io/auth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(authPayload)
    });

    if (!paggueAuthResponse.ok) {
      const errorText = await paggueAuthResponse.text();
      throw new Error(`Erro na autenticação Paggue: ${errorText}`);
    }

    const authData = await paggueAuthResponse.json();
    const accessToken = authData.access_token;
    logStep("Autenticado na Paggue com sucesso");

    // Criar cobrança PIX na Paggue usando a estrutura correta da API
    const pixPaymentData = {
      payer_name: user.user_metadata?.full_name || "Cliente",
      amount: Math.round(amount * 100), // Converter para centavos (valor inteiro)
      external_id: `raffle_${raffle.id}_${user.id}_${Date.now()}`,
      description: `Sorteio - Números: ${selectedNumbers.join(', ')}`,
      meta: {
        user_id: user.id,
        raffle_id: raffle.id,
        selected_numbers: selectedNumbers
      }
    };

    const payloadString = JSON.stringify(pixPaymentData);
    logStep("Payload para Paggue", pixPaymentData);

    // Criar assinatura SHA256
    const signature = await createSignature(payloadString, signatureToken);
    logStep("Assinatura criada", { signature: signature.substring(0, 10) + "..." });

    const pagguePaymentResponse = await fetch('https://ms.paggue.io/cashin/api/billing_order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Company-ID': companyId,
        'Signature': signature
      },
      body: payloadString
    });

    if (!pagguePaymentResponse.ok) {
      const errorText = await pagguePaymentResponse.text();
      throw new Error(`Erro ao criar cobrança Paggue: ${errorText}`);
    }

    const paymentResult = await pagguePaymentResponse.json();
    logStep("Resposta completa da Paggue", paymentResult);

    // Extrair dados da resposta correta da Paggue
    const pixCode = paymentResult.payment; // O campo 'payment' contém o código PIX
    const transactionHash = paymentResult.hash; // Hash da transação
    const paymentStatus = paymentResult.status; // 0 = pending, 1 = paid

    logStep("Dados extraídos", { 
      pixCode: pixCode ? pixCode.substring(0, 50) + "..." : null,
      transactionHash,
      paymentStatus
    });

    // Salvar no banco de dados
    const { data: pixPayment, error: insertError } = await supabase
      .from('pix_payments')
      .insert({
        user_id: user.id,
        raffle_id: raffle.id,
        selected_numbers: selectedNumbers,
        amount: amount,
        paggue_transaction_id: transactionHash,
        pix_code: pixCode,
        qr_code_image: null, // A API da Paggue não retorna QR code image diretamente
        status: 'pending',
        expires_at: paymentResult.expiration_at || new Date(Date.now() + 10 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Erro ao salvar pagamento: ${insertError.message}`);
    }

    logStep("Pagamento salvo no banco", { pixPaymentId: pixPayment.id });

    return new Response(JSON.stringify({
      success: true,
      payment: {
        id: pixPayment.id,
        pix_code: pixPayment.pix_code,
        qr_code_image: pixPayment.qr_code_image,
        expires_at: pixPayment.expires_at,
        amount: pixPayment.amount
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});