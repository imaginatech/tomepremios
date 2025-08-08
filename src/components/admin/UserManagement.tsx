import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  Calendar,
  CreditCard,
  Trophy,
  Eye,
  Filter,
  Trash2,
  Download
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserProfile {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  pix_key: string | null;
  role: string | null;
  created_at: string;
}

interface UserStats {
  totalTickets: number;
  totalSpent: number;
  totalWon: number;
  participatedRaffles: number;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userStats, setUserStats] = useState<Record<string, UserStats>>({});
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setUsers(data || []);
      
      // Buscar estatísticas para cada usuário
      if (data) {
        const statsPromises = data.map(user => fetchUserStats(user.id));
        const statsResults = await Promise.all(statsPromises);
        
        const statsMap = data.reduce((acc, user, index) => {
          acc[user.id] = statsResults[index];
          return acc;
        }, {} as Record<string, UserStats>);
        
        setUserStats(statsMap);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async (userId: string): Promise<UserStats> => {
    try {
      // Buscar bilhetes do usuário
      const { data: tickets } = await supabase
        .from('raffle_tickets')
        .select('raffle_id, payment_status, ticket_number')
        .eq('user_id', userId);

      const totalTickets = tickets?.length || 0;
      const paidTickets = tickets?.filter(t => t.payment_status === 'paid') || [];

      // Buscar informações dos sorteios para calcular gastos
      let totalSpent = 0;
      let participatedRaffles = 0;
      
      if (paidTickets.length > 0) {
        const raffleIds = [...new Set(paidTickets.map(t => t.raffle_id))];
        participatedRaffles = raffleIds.length;
        
        const { data: raffles } = await supabase
          .from('raffles')
          .select('id, ticket_price')
          .in('id', raffleIds);

        const priceMap = Object.fromEntries(
          raffles?.map(r => [r.id, r.ticket_price]) || []
        );

        totalSpent = paidTickets.reduce((sum, ticket) => {
          const price = priceMap[ticket.raffle_id] || 0;
          return sum + Number(price);
        }, 0);
      }

      // Buscar prêmios ganhos (sorteios onde o usuário foi ganhador)
      const { data: wonRaffles } = await supabase
        .from('raffles')
        .select('prize_value, winning_number')
        .eq('status', 'completed')
        .not('winning_number', 'is', null);

      let totalWon = 0;
      if (wonRaffles && tickets) {
        for (const raffle of wonRaffles) {
          const userWinningTicket = tickets.find(
            t => t.ticket_number === raffle.winning_number
          );
          if (userWinningTicket) {
            totalWon += Number(raffle.prize_value);
          }
        }
      }

      return {
        totalTickets,
        totalSpent,
        totalWon,
        participatedRaffles
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        totalTickets: 0,
        totalSpent: 0,
        totalWon: 0,
        participatedRaffles: 0
      };
    }
  };

  const filterUsers = () => {
    if (!searchTerm) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user => 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.whatsapp?.includes(searchTerm) ||
      user.pix_key?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredUsers(filtered);
  };

  const handleViewDetails = (user: UserProfile) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    setDeleteLoading(userId);
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { 
          userId: userId,
          isAdminAction: true 
        }
      });

      if (error) {
        console.error('Error deleting user:', error);
        toast({
          title: "Erro",
          description: "Erro ao excluir usuário. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Usuário excluído",
        description: `O usuário ${userName} foi excluído com sucesso.`,
      });

      // Refresh the users list
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir usuário. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(null);
    }
  };

  const getRoleBadge = (role: string | null) => {
    if (role === 'admin') {
      return <Badge variant="destructive">Admin</Badge>;
    }
    return <Badge variant="secondary">Usuário</Badge>;
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, whatsapp')
        .not('whatsapp', 'is', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const rows = (data || []) as { full_name: string | null; whatsapp: string | null }[];
      const header = ['Nome', 'WhatsApp'];
      const csv = [
        header.join(';'),
        ...rows.map((r) => {
          const name = (r.full_name || '(Sem nome)').replace(/"/g, '""');
          const wa = (r.whatsapp || '').replace(/"/g, '""');
          return `"${name}";"${wa}"`;
        })
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      link.href = url;
      link.setAttribute('download', `contatos_${yyyy}-${mm}-${dd}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Exportação concluída',
        description: `Exportados ${rows.length} contatos.`,
      });
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast({
        title: 'Erro ao exportar',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
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
        <h2 className="text-2xl font-bold">Gerenciar Usuários</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button variant="secondary" onClick={handleExportCSV} disabled={exporting}>
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredUsers.map((user) => {
          const stats = userStats[user.id] || {
            totalTickets: 0,
            totalSpent: 0,
            totalWon: 0,
            participatedRaffles: 0
          };

          return (
            <Card key={user.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  {getRoleBadge(user.role)}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewDetails(user)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deleteLoading === user.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Isso irá permanentemente excluir o usuário 
                          <strong> {user.full_name || 'sem nome'}</strong> e remover todos os seus dados, incluindo:
                          <br /><br />
                          • Dados pessoais
                          <br />
                          • Histórico de participação em sorteios
                          <br />
                          • Bilhetes comprados
                          <br />
                          • Informações de afiliado (se aplicável)
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteUser(user.id, user.full_name || 'Usuário')}
                          disabled={deleteLoading === user.id}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleteLoading === user.id ? "Excluindo..." : "Sim, excluir usuário"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-lg truncate">
                  {user.full_name || 'Nome não informado'}
                </h3>
                
                {user.whatsapp && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{user.whatsapp}</span>
                  </div>
                )}

                {user.pix_key && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CreditCard className="w-4 h-4 mr-2" />
                    <span className="truncate">{user.pix_key}</span>
                  </div>
                )}

                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bilhetes:</span>
                  <span className="font-semibold">{stats.totalTickets}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gasto:</span>
                  <span className="font-semibold text-green-600">
                    R$ {stats.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ganho:</span>
                  <span className="font-semibold text-accent">
                    R$ {stats.totalWon.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sorteios:</span>
                  <span className="font-semibold">{stats.participatedRaffles}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredUsers.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum usuário encontrado</h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Ainda não há usuários cadastrados.'}
          </p>
        </div>
      )}

      {/* Modal de detalhes do usuário */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-semibold">Detalhes do Usuário</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUserDetails(false)}
                >
                  Fechar
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Informações Pessoais</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-muted-foreground">Nome:</span>
                      <p className="font-medium">{selectedUser.full_name || 'Não informado'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">WhatsApp:</span>
                      <p className="font-medium">{selectedUser.whatsapp || 'Não informado'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Chave PIX:</span>
                      <p className="font-medium">{selectedUser.pix_key || 'Não informado'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Tipo:</span>
                      <div className="mt-1">{getRoleBadge(selectedUser.role)}</div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Cadastro:</span>
                      <p className="font-medium">
                        {format(new Date(selectedUser.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Estatísticas</h4>
                  <div className="space-y-2">
                    {Object.entries(userStats[selectedUser.id] || {}).map(([key, value]) => {
                      const labels = {
                        totalTickets: 'Total de Bilhetes',
                        totalSpent: 'Total Gasto',
                        totalWon: 'Total Ganho',
                        participatedRaffles: 'Sorteios Participados'
                      };
                      
                      return (
                        <div key={key}>
                          <span className="text-sm text-muted-foreground">{labels[key as keyof typeof labels]}:</span>
                          <p className="font-medium">
                            {key.includes('total') && key !== 'totalTickets' 
                              ? `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : value
                            }
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
