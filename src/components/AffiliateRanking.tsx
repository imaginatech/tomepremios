
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Award, Crown, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface AffiliateRanking {
  affiliate_id: string;
  affiliate_code: string;
  referrals_count: number;
  user_name: string | null;
  rank: number;
}

const AffiliateRanking = () => {
  const [rankings, setRankings] = useState<AffiliateRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🚀 Chamando edge function get-affiliate-ranking...');
      
      const { data, error } = await supabase.functions.invoke('get-affiliate-ranking');

      console.log('📊 Resposta da edge function:', data);

      if (error) {
        console.error('❌ Erro ao chamar edge function:', error);
        throw error;
      }

      if (data?.success) {
        console.log(`✅ Encontrados ${data.data.rankings?.length || 0} afiliados no ranking`);
        setRankings(data.data.rankings || []);
        setDebugInfo(data.data.debug);
      } else {
        console.error('❌ Resposta inválida da edge function:', data);
        setError('Resposta inválida do servidor');
        setDebugInfo(data?.data?.debug);
      }
    } catch (error: any) {
      console.error('❌ Erro ao buscar ranking:', error);
      setError(error.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Award className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Trophy className="w-5 h-5 text-amber-600" />;
      default:
        return <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center">{rank}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Top 10 Afiliados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg animate-pulse">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-32 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-24"></div>
                </div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Top 10 Afiliados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">
              Erro ao carregar ranking: {error}
            </p>
            <Button onClick={fetchRanking} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </Button>
            {debugInfo && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Ver informações de debug
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Top 10 Afiliados
        </CardTitle>
        <CardDescription>
          Ranking dos afiliados com mais indicações válidas
          <br />
          <span className="text-primary font-medium">🏆 1º lugar ganha 1 salário todo dia 25 do mês!</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rankings.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Nenhuma indicação válida registrada ainda.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Seja o primeiro a indicar alguém que compre um título!
            </p>
            <Button onClick={fetchRanking} variant="outline" size="sm" className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {rankings.map((affiliate) => (
              <div
                key={affiliate.affiliate_id}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                  affiliate.rank === 1 
                    ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200 dark:from-yellow-950 dark:to-yellow-900 dark:border-yellow-800' 
                    : 'bg-muted/50 hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-center">
                  {getRankIcon(affiliate.rank)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${affiliate.rank === 1 ? 'text-black' : 'text-foreground'}`}>
                    {affiliate.user_name || 'Afiliado'}
                  </p>
                  <p className="text-sm text-muted-foreground font-mono">
                    #{affiliate.affiliate_code}
                  </p>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className={`font-bold text-lg ${affiliate.rank === 1 ? 'text-black' : ''}`}>
                      {affiliate.referrals_count}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    indicação{affiliate.referrals_count !== 1 ? 'ões' : ''}
                  </p>
                </div>
                
                {affiliate.rank === 1 && (
                  <div className="text-center">
                    <Badge variant="default" className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black">
                      Líder
                    </Badge>
                    <p className="text-xs text-black font-medium mt-1">
                      1 salário
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h4 className="font-medium text-primary mb-2">Como funciona?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Indique pessoas usando seu link de afiliado</li>
            <li>• Ganhe 1 ponto por cada indicado que comprar um título</li>
            <li>• O 1º lugar do mês ganha 1 salário via PIX</li>
            <li>• Premiação automática todo dia 25 do mês às 20h</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AffiliateRanking;
