
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Trophy, DollarSign } from 'lucide-react';

interface PollOption {
  label: string;
}

interface Poll {
  id: string;
  title: string;
  question: string | null;
  options: PollOption[];
  winning_option?: number | null;
  prize_amount: number;
  entry_price: number;
  status: string;
  category: string | null;
}

interface PollCardProps {
  poll: Poll;
  onParticipate: (pollId: string, selectedOption: number) => void;
  hasParticipated: boolean;
  userSelection?: number;
}

const PollCard: React.FC<PollCardProps> = ({ poll, onParticipate, hasParticipated, userSelection }) => {
  const [selectedOption, setSelectedOption] = useState<string>('');

  const statusMap: Record<string, { label: string; className: string }> = {
    active: { label: 'Aberta', className: 'bg-primary text-primary-foreground' },
    closed: { label: 'Encerrada', className: 'bg-destructive text-destructive-foreground' },
    completed: { label: 'Finalizada', className: 'bg-muted text-muted-foreground' },
  };

  const statusInfo = statusMap[poll.status] || statusMap.active;

  return (
    <Card className="border border-border hover-lift transition-all duration-300 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
          {poll.category && (
            <Badge variant="outline" className="text-xs">{poll.category}</Badge>
          )}
        </div>
        <CardTitle className="text-lg leading-tight">{poll.title}</CardTitle>
        {poll.question && (
          <p className="text-sm text-muted-foreground mt-1">{poll.question}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-accent">
          <Trophy className="w-4 h-4" />
          <span className="font-semibold text-sm">
            Prêmio estimado: R$ {poll.prize_amount.toFixed(2).replace('.', ',')}
          </span>
        </div>

        {hasParticipated ? (
          <div className="bg-primary/10 rounded-lg p-3 text-center">
            <p className="text-sm font-medium text-primary">✅ Você já participou!</p>
            {userSelection !== undefined && poll.options[userSelection] && (
              <p className="text-xs text-muted-foreground mt-1">
                Sua escolha: <strong>{poll.options[userSelection].label}</strong>
              </p>
            )}
            {poll.status === 'completed' && poll.winning_option !== undefined && poll.winning_option !== null && (
              <p className="text-xs mt-1">
                Resposta certa: <strong>{poll.options[poll.winning_option]?.label}</strong>
                {userSelection === poll.winning_option ? (
                  <span className="text-primary ml-1">🎉 Você acertou!</span>
                ) : (
                  <span className="text-destructive ml-1">❌</span>
                )}
              </p>
            )}
          </div>
        ) : poll.status === 'active' ? (
          <>
            <RadioGroup value={selectedOption} onValueChange={setSelectedOption} className="space-y-2">
              {poll.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-3 rounded-lg border border-border p-3 hover:bg-secondary/50 transition-colors">
                  <RadioGroupItem value={String(index)} id={`${poll.id}-option-${index}`} />
                  <Label htmlFor={`${poll.id}-option-${index}`} className="flex-1 cursor-pointer text-sm">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <Button
              className="w-full btn-pix text-white font-bold"
              disabled={selectedOption === ''}
              onClick={() => onParticipate(poll.id, parseInt(selectedOption))}
            >
              <DollarSign className="w-4 h-4 mr-1" />
              PARTICIPAR POR R$ {poll.entry_price.toFixed(2).replace('.', ',')}
            </Button>
          </>
        ) : (
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">Esta enquete está encerrada</p>
            {poll.status === 'completed' && poll.winning_option !== undefined && poll.winning_option !== null && (
              <p className="text-xs mt-1">
                Resposta certa: <strong>{poll.options[poll.winning_option]?.label}</strong>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PollCard;
