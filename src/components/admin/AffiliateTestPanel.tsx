import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader, Play, CheckCircle, AlertCircle } from 'lucide-react';

interface TestResult {
  action: string;
  success: boolean;
  message: string;
  data?: any;
}

export const AffiliateTestPanel = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const runAffiliateTest = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      const testResults: TestResult[] = [];

      // 1. Verificar se existe usuário com código de afiliado
      const { data: testUser, error: userError } = await supabase
        .from('profiles')
        .select('id, referred_by, full_name')
        .not('referred_by', 'is', null)
        .limit(1)
        .single();

      if (userError || !testUser) {
        testResults.push({
          action: 'Verificar usuário teste',
          success: false,
          message: 'Nenhum usuário com código de afiliado encontrado'
        });
        setResults(testResults);
        setLoading(false);
        return;
      }

      testResults.push({
        action: 'Verificar usuário teste',
        success: true,
        message: `Usuário encontrado: ${testUser.full_name} (${testUser.referred_by})`
      });

      // 2. Verificar sorteio ativo
      const { data: activeRaffleId, error: raffleError } = await supabase
        .rpc('get_active_raffle');

      if (raffleError || !activeRaffleId) {
        testResults.push({
          action: 'Verificar sorteio ativo',
          success: false,
          message: 'Nenhum sorteio ativo encontrado'
        });
        setResults(testResults);
        setLoading(false);
        return;
      }

      testResults.push({
        action: 'Verificar sorteio ativo',
        success: true,
        message: `Sorteio ativo: ${activeRaffleId}`
      });

      // 3. Criar ticket de teste
      const { data: testTicket, error: ticketError } = await supabase
        .from('raffle_tickets')
        .insert({
          user_id: testUser.id,
          raffle_id: activeRaffleId,
          ticket_number: 198,
          payment_status: 'pending'
        })
        .select()
        .single();

      if (ticketError) {
        testResults.push({
          action: 'Criar ticket teste',
          success: false,
          message: `Erro ao criar ticket: ${ticketError.message}`
        });
        setResults(testResults);
        setLoading(false);
        return;
      }

      testResults.push({
        action: 'Criar ticket teste',
        success: true,
        message: `Ticket criado: ${testTicket.id}`
      });

      // 4. Aguardar e atualizar para paid (trigger deve disparar)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { error: updateError } = await supabase
        .from('raffle_tickets')
        .update({ payment_status: 'paid' })
        .eq('id', testTicket.id);

      if (updateError) {
        testResults.push({
          action: 'Atualizar ticket para paid',
          success: false,
          message: `Erro ao atualizar: ${updateError.message}`
        });
      } else {
        testResults.push({
          action: 'Atualizar ticket para paid',
          success: true,
          message: 'Ticket atualizado - trigger deve ter disparado'
        });
      }

      // 5. Aguardar processamento e verificar resultados
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verificar se affiliate_referrals foi criado/atualizado
      const { data: referrals, error: refError } = await supabase
        .from('affiliate_referrals')
        .select('*')
        .eq('referred_user_id', testUser.id);

      if (refError) {
        testResults.push({
          action: 'Verificar affiliate_referrals',
          success: false,
          message: `Erro: ${refError.message}`
        });
      } else {
        testResults.push({
          action: 'Verificar affiliate_referrals',
          success: referrals && referrals.length > 0,
          message: `${referrals?.length || 0} referral(s) encontrado(s)`,
          data: referrals
        });
      }

      // Verificar se números bônus foram criados
      const { data: bonusNumbers, error: bonusError } = await supabase
        .from('affiliate_bonus_numbers')
        .select('*')
        .eq('raffle_id', activeRaffleId);

      if (bonusError) {
        testResults.push({
          action: 'Verificar números bônus',
          success: false,
          message: `Erro: ${bonusError.message}`
        });
      } else {
        testResults.push({
          action: 'Verificar números bônus',
          success: bonusNumbers && bonusNumbers.length > 0,
          message: `${bonusNumbers?.length || 0} registro(s) de bônus encontrado(s)`,
          data: bonusNumbers
        });
      }

      setResults(testResults);
      
      toast({
        title: "Teste concluído",
        description: "Verifique os resultados abaixo",
      });

    } catch (error: any) {
      toast({
        title: "Erro no teste",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fixHistoricalData = async () => {
    setLoading(true);
    
    try {
      const { data: fixResults, error } = await supabase
        .rpc('fix_historical_affiliate_data');

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Dados históricos corrigidos",
          description: `${fixResults?.length || 0} ações executadas`,
        });
        console.log('Resultados da correção:', fixResults);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teste do Sistema de Afiliados</CardTitle>
        <CardDescription>
          Ferramentas para testar e debugar o sistema de afiliados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={runAffiliateTest}
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              <Loader className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Testar Sistema Completo
          </Button>
          
          <Button
            onClick={fixHistoricalData}
            disabled={loading}
            variant="secondary"
          >
            Corrigir Dados Históricos
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold">Resultados do Teste:</h4>
            {results.map((result, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 p-3 rounded-lg border ${
                  result.success 
                    ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                    : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{result.action}</p>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                  {result.data && (
                    <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};