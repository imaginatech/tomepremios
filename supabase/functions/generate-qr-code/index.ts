import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-QR-CODE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Iniciando geração de QR Code");

    const { pix_code } = await req.json();
    
    if (!pix_code || typeof pix_code !== 'string') {
      throw new Error("Código PIX é obrigatório");
    }

    logStep("Código PIX recebido", { pixCodeLength: pix_code.length });

    // Usar API pública para gerar QR Code
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(pix_code)}`;
    
    logStep("QR Code gerado", { url: qrCodeUrl });

    return new Response(JSON.stringify({
      success: true,
      qr_code_url: qrCodeUrl,
      pix_code: pix_code
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