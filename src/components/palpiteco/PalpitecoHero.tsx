
import React from 'react';
import { HelpCircle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const PalpitecoHero = () => {
  return (
    <section className="relative py-12 md:py-20 overflow-hidden">
      <div className="absolute inset-0 gradient-dark opacity-50"></div>
      <div className="absolute top-10 left-10 w-20 h-20 bg-accent/20 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-primary/20 rounded-full blur-xl animate-pulse delay-1000"></div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Banner de destaque */}
        <div className="mb-6">
          <Card className="gradient-green text-foreground p-4 border-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/10 animate-pulse"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 text-center">
                <span className="text-2xl animate-bounce">🤔</span>
                <div>
                  <h2 className="text-lg md:text-xl font-bold mb-1 text-white whitespace-nowrap">
                    ACERTE O PALPITE E GANHE!
                  </h2>
                  <p className="text-sm md:text-base text-white/90">
                    Escolha a opção certa nas enquetes e leve prêmios pra casa!
                  </p>
                </div>
                <span className="text-2xl animate-bounce delay-200">💰</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Banner Principal */}
        <div className="mb-8 text-center">
          <Card className="p-6 md:p-8 mb-8 bg-gradient-to-br from-accent/90 to-accent shine-effect hover-lift border-0">
            <div className="text-center">
              <div className="inline-flex items-center bg-background/20 rounded-full px-4 py-2 mb-4">
                <HelpCircle className="w-5 h-5 mr-2 text-accent-foreground" />
                <span className="font-semibold text-accent-foreground">PALPITECO</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold mb-4 text-accent-foreground">
                Dê seu Palpite e Ganhe!
              </h1>
              <p className="text-xl md:text-2xl mb-2 font-semibold text-accent-foreground/90">
                Enquetes com prêmios reais
              </p>
              <p className="text-sm text-accent-foreground/70 mb-6">
                Escolha a resposta certa e concorra a prêmios incríveis por apenas R$ 5,00
              </p>
            </div>
          </Card>

          <Button
            size="lg"
            className="btn-pix text-lg px-12 py-6 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 animate-pulse text-white"
            onClick={() => {
              const section = document.getElementById('enquetes');
              section?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <DollarSign className="w-6 h-6 mr-2" />
            VER ENQUETES DISPONÍVEIS
          </Button>
        </div>

        <div className="text-center">
          <p className="text-lg md:text-xl text-muted-foreground mb-4">
            Pagamento 100% seguro via PIX
          </p>
          <p className="text-sm text-muted-foreground">
            Participe por apenas R$ 5,00 e concorra a prêmios!
          </p>
        </div>
      </div>
    </section>
  );
};

export default PalpitecoHero;
