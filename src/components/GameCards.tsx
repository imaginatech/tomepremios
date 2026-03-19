
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Card Tome Prêmios */}
          <Card
            className="group cursor-pointer border-2 border-primary/20 hover:border-primary/60 transition-all duration-300 hover-lift overflow-hidden"
            onClick={() => navigate('/tome-premios')}>

            <div className="gradient-green h-[144px] flex items-center justify-center">
              <img
                src="https://f005.backblazeb2.com/file/HubAssets/12sorte.png"
                alt="12 da Sorte"
                className="max-h-[130px] w-auto object-contain drop-shadow-lg"
              />
            </div>
            <CardContent className="p-6">
              <p className="text-muted-foreground mb-4 text-center">
                Escolha 12 dezenas e concorra a prêmios diários! Acertando 4, 5 ou 6 dezenas você ganha.
              </p>
              <Button className="w-full btn-pix text-white font-bold group-hover:scale-105 transition-transform">
                Jogar Agora <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Card Palpiteco */}
          <Card
            className="group cursor-pointer border-2 border-accent/20 hover:border-accent/60 transition-all duration-300 hover-lift overflow-hidden"
            onClick={() => navigate('/palpiteco')}>

            <div className="bg-accent h-[144px] flex items-center justify-center">
              <img
                src="https://f005.backblazeb2.com/file/HubAssets/palpitaco.png"
                alt="Palpitaco"
                className="max-h-[130px] w-auto object-contain drop-shadow-lg"
              />
            </div>
            <CardContent className="p-6">
              <p className="text-muted-foreground mb-4 text-center">Dê seu palpite, participe das enquetes e transforme sua escolha em um prêmio incrível!

              </p>
              <Button className="w-full bg-accent hover:bg-accent/90 text-white font-bold group-hover:scale-105 transition-transform">
                Participar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Card Raspa Prêmios */}
          <Card
            className="group cursor-pointer border-2 border-orange-400/20 hover:border-orange-400/60 transition-all duration-300 hover-lift overflow-hidden"
            onClick={() => window.open('https://raspadinha.tomepremios.com.br', '_blank')}>

            <div className="bg-[#1a1a2e] h-[144px] flex items-center justify-center">
              <img
                src="https://f005.backblazeb2.com/file/HubAssets/logo-raspa.png"
                alt="Raspa Prêmios"
                className="max-h-[130px] w-auto object-contain drop-shadow-lg"
              />
            </div>
            <CardContent className="p-6">
              <p className="text-muted-foreground mb-4 text-center">
                Raspe e ganhe! Raspadinhas digitais com prêmios instantâneos do grupo Tome Prêmios.
              </p>
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold group-hover:scale-105 transition-transform">
                Raspar Agora <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>);

};

export default GameCards;