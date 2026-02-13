
import React from 'react';
import { HelpCircle, CreditCard, Trophy, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

const PalpitecoHowItWorks = () => {
  const steps = [
    {
      icon: HelpCircle,
      title: 'Escolha uma Enquete',
      description: 'Navegue pelas enquetes disponíveis e escolha a que mais te interessa.',
      color: 'bg-accent'
    },
    {
      icon: CheckCircle,
      title: 'Dê seu Palpite',
      description: 'Selecione a opção que você acredita ser a resposta certa.',
      color: 'bg-primary'
    },
    {
      icon: CreditCard,
      title: 'Pague via PIX',
      description: 'Faça o pagamento de R$ 5,00 via PIX. Rápido e seguro!',
      color: 'bg-accent'
    },
    {
      icon: Trophy,
      title: 'Ganhe o Prêmio!',
      description: 'Se você acertou o palpite, o prêmio é seu! Transferência via PIX.',
      color: 'bg-primary'
    }
  ];

  return (
    <section className="py-12" id="como-funciona-palpiteco">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 golden-text">
            Como Funciona o Palpiteco?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Participar é muito simples! Siga os passos abaixo e concorra a prêmios.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {steps.map((step, index) => (
            <Card key={index} className="p-6 text-center hover-lift bg-card/50 backdrop-blur-sm relative">
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-accent-foreground font-bold text-sm">
                {index + 1}
              </div>
              <div className={`w-16 h-16 ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                <step.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-card/50 backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-3 text-primary">🏆 Como sei se ganhei?</h3>
            <p className="text-muted-foreground text-sm">
              Quando a enquete for encerrada e a resposta certa revelada, você será notificado se acertou!
            </p>
          </Card>
          <Card className="p-6 bg-card/50 backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-3 text-accent">💰 Quando recebo o prêmio?</h3>
            <p className="text-muted-foreground text-sm">
              O prêmio é transferido via PIX em até 10 minutos após o resultado. Rápido e seguro!
            </p>
          </Card>
          <Card className="p-6 bg-card/50 backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-3 text-primary">📱 Posso participar pelo celular?</h3>
            <p className="text-muted-foreground text-sm">
              Sim! Nossa plataforma é 100% mobile. Participe de qualquer lugar!
            </p>
          </Card>
          <Card className="p-6 bg-card/50 backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-3 text-accent">🔒 É seguro?</h3>
            <p className="text-muted-foreground text-sm">
              Totalmente seguro! Pagamentos via PIX com confirmação instantânea.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default PalpitecoHowItWorks;
