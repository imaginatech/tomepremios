
import React from 'react';
import { Trophy, Timer, Users, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const Hero = () => {
  return (
    <section className="relative py-12 md:py-20 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 gradient-dark opacity-50"></div>
      <div className="absolute top-10 left-10 w-20 h-20 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-accent/20 rounded-full blur-xl animate-pulse delay-1000"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Banner Principal */}
        <Card className="p-6 md:p-8 mb-8 gradient-gold text-white shine-effect hover-lift">
          <div className="text-center">
            <div className="inline-flex items-center bg-white/20 rounded-full px-4 py-2 mb-4">
              <Trophy className="w-5 h-5 mr-2" />
              <span className="font-semibold">SORTEIO ATIVO</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              EDIÇÃO #001
            </h1>
            <p className="text-xl md:text-2xl mb-6 font-semibold">
              CONCORRA A R$ 500,00
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold">200</div>
                <div className="text-sm opacity-90">Títulos Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold">R$ 5</div>
                <div className="text-sm opacity-90">Por Título</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold">156</div>
                <div className="text-sm opacity-90">Disponíveis</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold">78%</div>
                <div className="text-sm opacity-90">Vendidos</div>
              </div>
            </div>
            <Button size="lg" className="btn-pix text-lg px-8 py-4 hover-lift">
              <DollarSign className="w-5 h-5 mr-2" />
              PARTICIPAR AGORA
            </Button>
          </div>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 text-center hover-lift bg-card/50 backdrop-blur-sm">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">1,247</h3>
            <p className="text-muted-foreground">Participantes Ativos</p>
          </Card>

          <Card className="p-6 text-center hover-lift bg-card/50 backdrop-blur-sm">
            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">R$ 12,500</h3>
            <p className="text-muted-foreground">Total em Prêmios</p>
          </Card>

          <Card className="p-6 text-center hover-lift bg-card/50 backdrop-blur-sm">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
              <Timer className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">2h 15m</h3>
            <p className="text-muted-foreground">Para o Sorteio</p>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <p className="text-lg md:text-xl text-muted-foreground mb-4">
            Pagamento 100% seguro via PIX
          </p>
          <p className="text-sm text-muted-foreground">
            Seus números são reservados instantaneamente após o pagamento
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
