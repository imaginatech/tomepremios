
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Fire, Zap, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UrgentRaffle {
  id: string;
  title: string;
  prize_value: number;
  draw_date: string;
  total_tickets: number;
  sold_tickets: number;
}

const UrgencyAlerts = () => {
  const [urgentRaffles, setUrgentRaffles] = useState<UrgentRaffle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUrgentRaffles();
  }, []);

  const fetchUrgentRaffles = async () => {
    try {
      // Buscar sorteios ativos próximos ao fim
      const { data: raffles, error } = await supabase
        .from('raffles')
        .select('*')
        .eq('status', 'active')
        .gte('draw_date', new Date().toISOString())
        .lte('draw_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()) // próximos 7 dias
        .order('draw_date', { ascending: true });

      if (error) {
        console.error('Error fetching urgent raffles:', error);
        return;
      }

      // Contar tickets vendidos para cada sorteio
      const rafflesWithCounts = await Promise.all(
        (raffles || []).map(async (raffle) => {
          const { count } = await supabase
            .from('raffle_tickets')
            .select('*', { count: 'exact' })
            .eq('raffle_id', raffle.id);

          return {
            ...raffle,
            sold_tickets: count || 0
          };
        })
      );

      setUrgentRaffles(rafflesWithCounts);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyLevel = (raffle: UrgentRaffle) => {
    const daysUntilDraw = Math.ceil((new Date(raffle.draw_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const fillPercentage = (raffle.sold_tickets / raffle.total_tickets) * 100;
    
    if (daysUntilDraw <= 1) return 'critical';
    if (daysUntilDraw <= 3 || fillPercentage >= 80) return 'high';
    if (fillPercentage >= 60) return 'medium';
    return 'low';
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getUrgencyIcon = (level: string) => {
    switch (level) {
      case 'critical': return <Fire className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Zap className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Alertas de Urgência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="border rounded p-3">
                <div className="h-3 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Alertas de Urgência
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {urgentRaffles.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum alerta no momento
          </p>
        ) : (
          urgentRaffles.map((raffle) => {
            const urgencyLevel = getUrgencyLevel(raffle);
            const fillPercentage = (raffle.sold_tickets / raffle.total_tickets) * 100;
            
            return (
              <div key={raffle.id} className={`border rounded-lg p-3 ${getUrgencyColor(urgencyLevel)}`}>
                <div className="flex items-start gap-2 mb-2">
                  {getUrgencyIcon(urgencyLevel)}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{raffle.title}</h4>
                    <p className="text-xs opacity-80">
                      Sorteio {formatDistanceToNow(new Date(raffle.draw_date), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {raffle.sold_tickets}/{raffle.total_tickets}
                    </span>
                    <span>{fillPercentage.toFixed(0)}% vendido</span>
                  </div>
                  
                  <div className="w-full bg-white/50 rounded-full h-1.5">
                    <div 
                      className="bg-current h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${fillPercentage}%` }}
                    ></div>
                  </div>
                  
                  {urgencyLevel === 'critical' && (
                    <Button size="sm" className="w-full mt-2" onClick={() => window.location.href = '/#sorteios'}>
                      Participar Agora!
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
        
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            🔥 Não perca as oportunidades!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default UrgencyAlerts;
