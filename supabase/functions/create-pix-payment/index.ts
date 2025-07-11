import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PagguePixPayload {
  method: string
  amount: number
  customer: {
    name: string
    email: string
    document: string
  }
  description: string
}

interface PagguePixResponse {
  id: string
  amount: number
  status: string
  pix: {
    qr_code: string
    qr_code_image: string
    expires_at: string
  }
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
      .select('full_name, whatsapp')
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

    const { data: activeRaffle } = await supabase
      .from('raffles')
      .select('title')
      .eq('id', raffleId)
      .single();

    // Configurar API Key da Paggue
    const paggueApiKey = Deno.env.get('PAGGUE_CLIENT_KEY');
    const paggueEnvironment = Deno.env.get('PAGGUE_ENVIRONMENT') || 'sandbox';
    
    if (!paggueApiKey) {
      throw new Error('API Key da Paggue não configurada');
    }

    const paggueBaseUrl = paggueEnvironment === 'production' 
      ? 'https://api.paggue.io'
      : 'https://sandbox.paggue.io';

    console.log('Configuração Paggue:', { 
      environment: paggueEnvironment, 
      baseUrl: paggueBaseUrl,
      hasApiKey: !!paggueApiKey 
    });

    // Preparar payload para Paggue
    const pixPayload: PagguePixPayload = {
      method: 'pix',
      amount: Math.round(total * 100), // Converter para centavos
      customer: {
        name: profile.full_name || 'Cliente',
        email: profile.whatsapp || 'cliente@exemplo.com', // Campo obrigatório
        document: '00000000000', // CPF fictício para sandbox
      },
      description: `Compra de ${selectedNumbers.length} números da rifa: ${activeRaffle?.title || 'Rifinha'}`,
    };

    console.log('Payload Paggue:', JSON.stringify(pixPayload, null, 2));

    // Criar pagamento PIX na Paggue
    const paggueResponse = await fetch(`${paggueBaseUrl}/v1/charges`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paggueApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pixPayload),
    });

    if (!paggueResponse.ok) {
      const errorText = await paggueResponse.text();
      console.error('Erro na resposta do Paggue:', errorText);
      throw new Error(`Erro ao criar pagamento PIX: ${paggueResponse.status} - ${errorText}`);
    }

    const paggueData: PagguePixResponse = await paggueResponse.json();
    
    console.log('Resposta da Paggue:', JSON.stringify(paggueData, null, 2));

    // Salvar o pagamento PIX no banco de dados
    const { data: pixPayment, error: pixError } = await supabase
      .from('pix_payments')
      .insert({
        user_id: userId,
        raffle_id: raffleId,
        selected_numbers: selectedNumbers,
        amount: total,
        status: 'pending',
        paggue_transaction_id: paggueData.id,
        qr_code_image: paggueData.pix?.qr_code_image || '',
        pix_code: paggueData.pix?.qr_code || '',
        expires_at: paggueData.pix?.expires_at || null,
      })
      .select()
      .single();

    if (pixError) {
      console.error('Erro ao salvar pagamento:', pixError);
      throw new Error('Erro ao salvar dados do pagamento');
    }

    console.log('Pagamento PIX criado com sucesso:', pixPayment);

    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          id: pixPayment.id,
          qr_code: paggueData.pix?.qr_code || '',
          qr_code_image: paggueData.pix?.qr_code_image || '',
          pix_code: paggueData.pix?.qr_code || '',
          amount: total,
          expires_at: paggueData.pix?.expires_at || null,
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