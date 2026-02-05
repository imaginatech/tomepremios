
import React from 'react';
import { Smartphone, CreditCard, Trophy, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

const HowItWorks = () => {
  const steps = [
    {
      icon: Smartphone,
      title: 'Escolha seus Números',
      description: 'Selecione quantos números quiser entre 01 e 60. Cada aposta custa apenas R$ 5,00.',
      color: 'bg-primary'
    },
    {
      icon: CreditCard,
      title: 'Pague via PIX',
      description: 'Faça o pagamento de forma rápida e segura usando PIX. Aprovação instantânea!',
      color: 'bg-accent'
    },
    {
      icon: CheckCircle,
      title: 'Confirme sua Participação',
      description: 'Receba a confirmação dos seus números por WhatsApp e no aplicativo. Seus títulos estão garantidos!',
      color: 'bg-primary'
    },
    {
      icon: Trophy,
      title: 'Aguarde o Sorteio',
      description: 'O sorteio é realizado ao vivo quando todos os números são vendidos ou na data limite.',
      color: 'bg-accent'
    }
  ];

  return (
    <section className="py-12" id="como-funciona">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 golden-text">
            Como Funciona?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Participar é muito simples! Siga os passos abaixo e concorra a prêmios incríveis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {steps.map((step, index) => (
            <Card key={index} className="p-6 text-center hover-lift bg-card/50 backdrop-blur-sm relative">
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white font-bold text-sm">
                {index + 1}
              </div>
              
              <div className={`w-16 h-16 ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                <step.icon className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>
            </Card>
          ))}
        </div>

        {/* FAQ Rápido */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-card/50 backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-3 text-primary">💰 Quando recebo o prêmio?</h3>
            <p className="text-muted-foreground text-sm">
              O prêmio é transferido via PIX em até 10 minutos após o sorteio. Rápido e seguro!
            </p>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-3 text-accent">🎯 Como é feito o sorteio?</h3>
            <p className="text-muted-foreground text-sm">
              Utilizamos plataforma auditada e totalmente segura para garantir total transparência e legitimidade do sorteio.
            </p>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-3 text-primary">📱 Posso comprar pelo celular?</h3>
            <p className="text-muted-foreground text-sm">
              Sim! Nossa plataforma é 100% mobile. Compre de qualquer lugar, a qualquer hora.
            </p>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-3 text-accent">🔒 É seguro participar?</h3>
            <p className="text-muted-foreground text-sm">
              Totalmente seguro! Somos regulamentados e todos os sorteios são fiscalizados.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
