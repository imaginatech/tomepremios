import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Star } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InstantPrize {
  id: string;
  raffle_id: string;
  ticket_numbers: number[];
  prize_amount: number;
  prize_description: string;
  claimed: boolean;
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
}

interface Raffle {
  id: string;
  title: string;
  status: string;
  total_tickets: number;
}

export function InstantPrizesManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [prizes, setPrizes] = useState<InstantPrize[]>([]);
  const [activeRaffle, setActiveRaffle] = useState<Raffle | null>(null);
  const [soldNumbers, setSoldNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [prizeAmount, setPrizeAmount] = useState("");
  const [prizeDescription, setPrizeDescription] = useState("Prêmio Instantâneo");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carregar sorteio ativo
      const { data: raffleData } = await supabase
        .from('raffles')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (raffleData) {
        setActiveRaffle(raffleData);
        
        // Carregar números vendidos
        const { data: ticketsData } = await supabase
          .from('raffle_tickets')
          .select('ticket_number')
          .eq('raffle_id', raffleData.id)
          .eq('payment_status', 'paid');

        setSoldNumbers(ticketsData?.map(t => t.ticket_number) || []);

        // Carregar prêmios instantâneos
        const { data: prizesData } = await supabase
          .from('instant_prizes')
          .select('*')
          .eq('raffle_id', raffleData.id)
          .order('created_at', { ascending: false });

        setPrizes(prizesData || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados dos prêmios instantâneos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNumberToggle = (number: number) => {
    if (soldNumbers.includes(number)) {
      toast({
        title: "Número já vendido",
        description: "Este número já foi vendido e não pode receber prêmio instantâneo",
        variant: "destructive",
      });
      return;
    }

    setSelectedNumbers(prev => 
      prev.includes(number) 
        ? prev.filter(n => n !== number)
        : [...prev, number]
    );
  };

  const handleCreatePrize = async () => {
    if (!activeRaffle || selectedNumbers.length === 0 || !prizeAmount) {
      toast({
        title: "Dados incompletos",
        description: "Selecione números e defina o valor do prêmio",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from('instant_prizes')
        .insert({
          raffle_id: activeRaffle.id,
          ticket_numbers: selectedNumbers,
          prize_amount: parseFloat(prizeAmount),
          prize_description: prizeDescription,
        });

      if (error) throw error;

      toast({
        title: "Prêmio criado!",
        description: `Prêmio de R$ ${prizeAmount} criado para ${selectedNumbers.length} números`,
      });

      // Limpar form
      setSelectedNumbers([]);
      setPrizeAmount("");
      setPrizeDescription("Prêmio Instantâneo");
      
      // Recarregar dados
      loadData();
    } catch (error) {
      console.error('Erro ao criar prêmio:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar prêmio instantâneo",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePrize = async (prizeId: string) => {
    try {
      const { error } = await supabase
        .from('instant_prizes')
        .delete()
        .eq('id', prizeId);

      if (error) throw error;

      toast({
        title: "Prêmio removido",
        description: "Prêmio instantâneo removido com sucesso",
      });

      loadData();
    } catch (error) {
      console.error('Erro ao remover prêmio:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover prêmio instantâneo",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  if (!activeRaffle) {
    return (
      <Alert>
        <AlertDescription>
          Nenhum sorteio ativo encontrado. Crie um sorteio primeiro para configurar prêmios instantâneos.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Prêmios Instantâneos</h2>
        <p className="text-muted-foreground">
          Configure números premiados para o sorteio: {activeRaffle.title}
        </p>
      </div>

      {/* Criar Novo Prêmio */}
      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Prêmio Instantâneo</CardTitle>
          <CardDescription>
            Selecione números e configure o prêmio que será entregue instantaneamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="prize-amount">Valor do Prêmio (R$)</Label>
              <Input
                id="prize-amount"
                type="number"
                step="0.01"
                value={prizeAmount}
                onChange={(e) => setPrizeAmount(e.target.value)}
                placeholder="25.00"
              />
            </div>
            <div>
              <Label htmlFor="prize-description">Descrição</Label>
              <Input
                id="prize-description"
                value={prizeDescription}
                onChange={(e) => setPrizeDescription(e.target.value)}
                placeholder="Prêmio Instantâneo"
              />
            </div>
          </div>

          <div>
            <Label>Números Selecionados ({selectedNumbers.length})</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedNumbers.map(num => (
                <Badge key={num} variant="secondary" className="cursor-pointer" onClick={() => handleNumberToggle(num)}>
                  {num.toString().padStart(3, '0')} ✕
                </Badge>
              ))}
            </div>
          </div>

          {/* Seletor de Números Simplificado */}
          <div>
            <Label>Selecionar Números (1-{activeRaffle.total_tickets})</Label>
            <div className="grid grid-cols-10 gap-2 mt-2 max-h-64 overflow-y-auto">
              {Array.from({ length: activeRaffle.total_tickets }, (_, i) => i + 1).map(num => {
                const isSold = soldNumbers.includes(num);
                const isSelected = selectedNumbers.includes(num);
                
                return (
                  <Button
                    key={num}
                    size="sm"
                    variant={isSelected ? "default" : isSold ? "destructive" : "outline"}
                    onClick={() => handleNumberToggle(num)}
                    disabled={isSold}
                    className="h-8 text-xs"
                  >
                    {num.toString().padStart(3, '0')}
                  </Button>
                );
              })}
            </div>
          </div>

          <Button 
            onClick={handleCreatePrize} 
            disabled={creating || selectedNumbers.length === 0 || !prizeAmount}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            {creating ? "Criando..." : "Criar Prêmio Instantâneo"}
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Prêmios Criados */}
      <Card>
        <CardHeader>
          <CardTitle>Prêmios Configurados</CardTitle>
          <CardDescription>
            Prêmios instantâneos ativos para este sorteio
          </CardDescription>
        </CardHeader>
        <CardContent>
          {prizes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum prêmio instantâneo configurado ainda
            </p>
          ) : (
            <div className="space-y-4">
              {prizes.map(prize => (
                <div key={prize.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium">R$ {prize.prize_amount.toFixed(2)}</span>
                      <Badge variant={prize.claimed ? "destructive" : "secondary"}>
                        {prize.claimed ? "Reivindicado" : "Disponível"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{prize.prize_description}</p>
                    <div className="flex flex-wrap gap-1">
                      {prize.ticket_numbers.map(num => (
                        <Badge key={num} variant="outline" className="text-xs">
                          {num.toString().padStart(3, '0')}
                        </Badge>
                      ))}
                    </div>
                    {prize.claimed && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Reivindicado em: {new Date(prize.claimed_at!).toLocaleString()}
                      </p>
                    )}
                  </div>
                  {!prize.claimed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePrize(prize.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}