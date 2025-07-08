
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, 
  Edit, 
  Trash2, 
  CalendarIcon, 
  Trophy,
  DollarSign,
  Users,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

interface Raffle {
  id: string;
  title: string;
  description: string | null;
  prize_value: number;
  ticket_price: number;
  total_tickets: number;
  draw_date: string;
  campaign_start_date: string | null;
  campaign_end_date: string | null;
  auto_start_next: boolean;
  status: string;
  winning_number: number | null;
  created_at: string;
}

const RaffleManagement = () => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRaffle, setEditingRaffle] = useState<Raffle | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prize_value: '',
    ticket_price: '5.00',
    total_tickets: '200',
    draw_date: new Date(),
    campaign_start_date: new Date(),
    campaign_end_date: new Date(),
    auto_start_next: false
  });

  useEffect(() => {
    fetchRaffles();
  }, []);

  const fetchRaffles = async () => {
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRaffles(data || []);
    } catch (error) {
      console.error('Error fetching raffles:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar sorteios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const raffleData = {
        title: formData.title,
        description: formData.description || null,
        prize_value: parseFloat(formData.prize_value),
        ticket_price: parseFloat(formData.ticket_price),
        total_tickets: parseInt(formData.total_tickets),
        draw_date: formData.draw_date.toISOString(),
        campaign_start_date: formData.campaign_start_date.toISOString(),
        campaign_end_date: formData.campaign_end_date.toISOString(),
        auto_start_next: formData.auto_start_next,
        status: 'active'
      };

      if (editingRaffle) {
        const { error } = await supabase
          .from('raffles')
          .update(raffleData)
          .eq('id', editingRaffle.id);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Sorteio atualizado com sucesso!"
        });
      } else {
        const { error } = await supabase
          .from('raffles')
          .insert([raffleData]);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Sorteio criado com sucesso!"
        });
      }

      resetForm();
      fetchRaffles();
    } catch (error) {
      console.error('Error saving raffle:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar sorteio",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (raffle: Raffle) => {
    setEditingRaffle(raffle);
    setFormData({
      title: raffle.title,
      description: raffle.description || '',
      prize_value: raffle.prize_value.toString(),
      ticket_price: raffle.ticket_price.toString(),
      total_tickets: raffle.total_tickets.toString(),
      draw_date: new Date(raffle.draw_date),
      campaign_start_date: raffle.campaign_start_date ? new Date(raffle.campaign_start_date) : new Date(),
      campaign_end_date: raffle.campaign_end_date ? new Date(raffle.campaign_end_date) : new Date(),
      auto_start_next: raffle.auto_start_next || false
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este sorteio?')) return;

    try {
      const { error } = await supabase
        .from('raffles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Sorteio excluído com sucesso!"
      });
      fetchRaffles();
    } catch (error) {
      console.error('Error deleting raffle:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir sorteio",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      prize_value: '',
      ticket_price: '5.00',
      total_tickets: '200',
      draw_date: new Date(),
      campaign_start_date: new Date(),
      campaign_end_date: new Date(),
      auto_start_next: false
    });
    setEditingRaffle(null);
    setShowForm(false);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: { label: 'Ativo', variant: 'default' as const },
      completed: { label: 'Concluído', variant: 'secondary' as const },
      cancelled: { label: 'Cancelado', variant: 'destructive' as const }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.active;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciar Sorteios</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Sorteio
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingRaffle ? 'Editar Sorteio' : 'Novo Sorteio'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="prize_value">Valor do Prêmio (R$)</Label>
                <Input
                  id="prize_value"
                  type="number"
                  step="0.01"
                  value={formData.prize_value}
                  onChange={(e) => setFormData({ ...formData, prize_value: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ticket_price">Preço do Bilhete (R$)</Label>
                <Input
                  id="ticket_price"
                  type="number"
                  step="0.01"
                  value={formData.ticket_price}
                  onChange={(e) => setFormData({ ...formData, ticket_price: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="total_tickets">Total de Bilhetes</Label>
                <Input
                  id="total_tickets"
                  type="number"
                  value={formData.total_tickets}
                  onChange={(e) => setFormData({ ...formData, total_tickets: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Data do Sorteio</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.draw_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.draw_date, "PPP", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.draw_date}
                      onSelect={(date) => date && setFormData({ ...formData, draw_date: date })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Início da Campanha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.campaign_start_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.campaign_start_date, "PPP", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.campaign_start_date}
                      onSelect={(date) => date && setFormData({ ...formData, campaign_start_date: date })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Fim da Campanha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.campaign_end_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.campaign_end_date, "PPP", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.campaign_end_date}
                      onSelect={(date) => date && setFormData({ ...formData, campaign_end_date: date })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="auto_start_next"
                checked={formData.auto_start_next}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_start_next: checked })}
              />
              <Label htmlFor="auto_start_next">
                Iniciar próxima edição automaticamente
              </Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingRaffle ? 'Atualizar' : 'Criar'} Sorteio
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {raffles.map((raffle) => (
          <Card key={raffle.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-lg truncate">{raffle.title}</h3>
              {getStatusBadge(raffle.status)}
            </div>
            
            {raffle.description && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {raffle.description}
              </p>
            )}

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm">
                <Trophy className="w-4 h-4 mr-2 text-accent" />
                <span>R$ {raffle.prize_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center text-sm">
                <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                <span>R$ {raffle.ticket_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / bilhete</span>
              </div>
              <div className="flex items-center text-sm">
                <Users className="w-4 h-4 mr-2 text-blue-500" />
                <span>{raffle.total_tickets} bilhetes</span>
              </div>
              <div className="flex items-center text-sm">
                <CalendarIcon className="w-4 h-4 mr-2 text-orange-500" />
                <span>{format(new Date(raffle.draw_date), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(raffle)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDelete(raffle.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RaffleManagement;
