import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Calendar, TrendingUp } from 'lucide-react';

const AffiliateWinners = () => {
  const affiliateWinners = [
    {
      name: "Weverson Armani",
      period: "Janeiro 2025",
      referrals: 34,
      prize: "1 salário",
      date: "25 Jan 2025"
    }
  ];

  return (
    <section className="bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            🏆 Afiliados Ganhadores
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Conheça os afiliados campeões que se destacaram e ganharam prêmios especiais
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {affiliateWinners.map((winner, index) => (
            <Card key={index} className="border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg bg-card/50 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center mb-3">
                  <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-full p-3">
                    <Trophy className="w-6 h-6" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold text-foreground">
                  {winner.name}
                </CardTitle>
                <p className="text-primary font-semibold">{winner.period}</p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Indicações</span>
                  </div>
                  <span className="font-bold text-foreground">{winner.referrals}</span>
                </div>
                
                <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-600 dark:text-green-400">Prêmio</span>
                  </div>
                  <span className="font-bold text-green-600 dark:text-green-400">{winner.prize}</span>
                </div>
                
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
                  <Calendar className="w-4 h-4" />
                  <span>{winner.date}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-muted-foreground">
            Seja você o próximo afiliado campeão! 
            <span className="text-primary font-semibold"> Participe do nosso programa de afiliados</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default AffiliateWinners;