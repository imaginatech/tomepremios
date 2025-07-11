import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PagguePixPayload {
  amount: number
  description: string
  customer_name: string
  customer_document?: string
  expires_in?: number
}

interface PagguePixResponse {
  id: string
  qr_code: string
  qr_code_image: string
  pix_key: string
  amount: number
  status: string
  expires_at: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Iniciando criação de pagamento PIX com Paggue');
    console.log('Método da requisição:', req.method);
    console.log('Headers da requisição:', Object.fromEntries(req.headers.entries()));
    
    // Verificar se o método é POST
    if (req.method !== 'POST') {
      console.error('Método não permitido:', req.method);
      throw new Error('Método não permitido');
    }

    const requestBody = await req.json();
    console.log('Dados recebidos:', requestBody);
    
    const { userId, selectedNumbers, total } = requestBody;

    if (!userId || !selectedNumbers || !total) {
      throw new Error('Dados obrigatórios não fornecidos');
    }

    // Inicializar cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar dados do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Erro ao buscar perfil:', profileError);
      throw new Error('Usuário não encontrado');
    }

    // Buscar sorteio ativo
    const { data: raffleId } = await supabase.rpc('get_active_raffle');
    
    if (!raffleId) {
      throw new Error('Nenhum sorteio ativo encontrado');
    }

    // Configurar credenciais Paggue
    const paggueClientKey = Deno.env.get('PAGGUE_CLIENT_KEY');
    const paggueClientSecret = Deno.env.get('PAGGUE_CLIENT_SECRET');
    const paggueEnvironment = Deno.env.get('PAGGUE_ENVIRONMENT') || 'sandbox';
    
    if (!paggueClientKey || !paggueClientSecret) {
      throw new Error('Credenciais da Paggue não configuradas');
    }

    const paggueBaseUrl = paggueEnvironment === 'production' 
      ? 'https://api.paggue.io'
      : 'https://sandbox-api.paggue.io';

    console.log('Configuração Paggue:', { 
      environment: paggueEnvironment, 
      baseUrl: paggueBaseUrl,
      hasClientKey: !!paggueClientKey,
      hasClientSecret: !!paggueClientSecret 
    });

    // Obter token de acesso
    const authResponse = await fetch(`${paggueBaseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: paggueClientKey,
        client_secret: paggueClientSecret
      }),
    });

    if (!authResponse.ok) {
      const authError = await authResponse.text();
      console.error('Erro na autenticação Paggue:', authError);
      throw new Error(`Erro na autenticação: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;
    
    if (!accessToken) {
      throw new Error('Token de acesso não recebido');
    }

    console.log('Token de acesso obtido com sucesso');

    // Preparar payload para Paggue
    const pixPayload: PagguePixPayload = {
      amount: total,
      description: `Rifinha - Números: ${selectedNumbers.join(', ')}`,
      customer_name: profile.full_name || 'Cliente',
      expires_in: 900 // 15 minutos
    };

    console.log('Enviando requisição para Paggue:', pixPayload);

    // Fazer requisição para Paggue
    const paggueResponse = await fetch(`${paggueBaseUrl}/v1/charges/pix`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pixPayload),
    });

    if (!paggueResponse.ok) {
      const errorText = await paggueResponse.text();
      console.error('Erro na resposta do Paggue:', errorText);
      throw new Error(`Erro ao criar pagamento PIX: ${paggueResponse.status}`);
    }

    const paggueData: PagguePixResponse = await paggueResponse.json();
    console.log('Resposta do Paggue recebida:', paggueData);

    // Salvar no banco de dados
    const { data: pixPayment, error: insertError } = await supabase
      .from('pix_payments')
      .insert({
        user_id: userId,
        raffle_id: raffleId,
        selected_numbers: selectedNumbers,
        amount: total,
        paggue_transaction_id: paggueData.id,
        pix_code: paggueData.pix_key,
        qr_code_image: paggueData.qr_code_image,
        status: 'pending',
        expires_at: paggueData.expires_at,
        paggue_webhook_data: paggueData
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao salvar pagamento:', insertError);
      throw new Error('Erro ao salvar dados do pagamento');
    }

    console.log('Pagamento PIX criado com sucesso:', pixPayment);

    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          id: pixPayment.id,
          qr_code: paggueData.qr_code,
          qr_code_image: paggueData.qr_code_image,
          pix_code: paggueData.pix_key,
          amount: total,
          expires_at: paggueData.expires_at,
          paggue_transaction_id: paggueData.id
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro na criação do pagamento PIX:', error);
    
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