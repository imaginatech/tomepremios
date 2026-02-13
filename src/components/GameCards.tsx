
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, HelpCircle, ArrowRight } from 'lucide-react';

const GameCards = () => {
  const navigate = useNavigate();

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2 text-foreground">
          Escolha seu Jogo
        </h2>
        <p className="text-center text-muted-foreground mb-8">
          Selecione um dos nossos jogos e concorra a prêmios incríveis!
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Card Tome Prêmios */}
          <Card 
            className="group cursor-pointer border-2 border-primary/20 hover:border-primary/60 transition-all duration-300 hover-lift overflow-hidden"
            onClick={() => navigate('/tome-premios')}
          >
            <div className="gradient-green p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">12 da Sorte</h3>
            </div>
            <CardContent className="p-6">
              <p className="text-muted-foreground mb-4 text-center">
                Escolha 12 dezenas e concorra a prêmios diários! Acertando 4, 5 ou 6 números você ganha.
              </p>
              <Button className="w-full btn-pix text-white group-hover:scale-105 transition-transform">
                Jogar Agora <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Card Palpiteco */}
          <Card 
            className="group cursor-pointer border-2 border-accent/20 hover:border-accent/60 transition-all duration-300 hover-lift overflow-hidden"
            onClick={() => navigate('/palpiteco')}
          >
            <div className="bg-accent p-6 text-center">
              <div className="w-16 h-16 bg-accent-foreground/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <HelpCircle className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-accent-foreground">Palpitaco</h3>
            </div>
            <CardContent className="p-6">
              <p className="text-muted-foreground mb-4 text-center">
                Dê seu palpite em enquetes e ganhe prêmios! Escolha a opção certa e leve o prêmio pra casa.
              </p>
              <Button className="w-full btn-gold text-white group-hover:scale-105 transition-transform">
                Participar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default GameCards;
