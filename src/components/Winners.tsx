
import React from 'react';
import { Trophy, Calendar, DollarSign, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const Winners = () => {
  const recentWinners = [
    {
      id: 1,
      name: 'Maria S.',
      number: '087',
      prize: 'R$ 500,00',
      date: '2024-01-15',
      edition: '#025'
    },
    {
      id: 2,
      name: 'João P.',
      number: '156',
      prize: 'R$ 500,00',
      date: '2024-01-10',
      edition: '#024'
    },
    {
      id: 3,
      name: 'Ana L.',
      number: '023',
      prize: 'R$ 500,00',
      date: '2024-01-05',
      edition: '#023'
    }
  ];

  return (
    <section className="py-12 bg-muted/30" id="ganhadores">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 golden-text">
            Últimos Ganhadores
          </h2>
          <p className="text-lg text-muted-foreground">
            Confira quem já foi contemplado nos nossos sorteios!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {recentWinners.map(winner => (
            <Card key={winner.id} className="p-6 hover-lift bg-card/80 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <Badge variant="secondary" className="bg-accent text-white">
                  {winner.edition}
                </Badge>
                <Trophy className="w-6 h-6 text-accent" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="font-semibold">{winner.name}</span>
                </div>
                
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 bg-primary rounded text-xs"></div>
                  <span>Número da Sorte: <strong>{winner.number}</strong></span>
                </div>
                
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-2 text-primary" />
                  <span className="text-lg font-bold text-primary">{winner.prize}</span>
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{new Date(winner.date).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center bg-card/50 backdrop-blur-sm">
            <div className="text-2xl font-bold text-primary mb-1">25</div>
            <div className="text-sm text-muted-foreground">Sorteios Realizados</div>
          </Card>
          
          <Card className="p-4 text-center bg-card/50 backdrop-blur-sm">
            <div className="text-2xl font-bold text-accent mb-1">R$ 12.500</div>
            <div className="text-sm text-muted-foreground">Total Distribuído</div>
          </Card>
          
          <Card className="p-4 text-center bg-card/50 backdrop-blur-sm">
            <div className="text-2xl font-bold text-primary mb-1">1.247</div>
            <div className="text-sm text-muted-foreground">Participantes</div>
          </Card>
          
          <Card className="p-4 text-center bg-card/50 backdrop-blur-sm">
            <div className="text-2xl font-bold text-accent mb-1">100%</div>
            <div className="text-sm text-muted-foreground">Taxa de Pagamento</div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Winners;
