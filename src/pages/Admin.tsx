import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminDashboard from '@/components/admin/AdminDashboard';
import RaffleManagement from '@/components/admin/RaffleManagement';
import UserManagement from '@/components/admin/UserManagement';
import AffiliateManagement from '@/components/admin/AffiliateManagement';
import WinnerManagement from '@/components/admin/WinnerManagement';
import { AffiliateTestPanel } from '@/components/admin/AffiliateTestPanel';
import { InstantPrizesManagement } from '@/components/admin/InstantPrizesManagement';
import LotterySettings from '@/components/admin/LotterySettings';
import PalpitecoManagement from '@/components/admin/PalpitecoManagement';
import { Shield } from 'lucide-react';

const Admin = () => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    } else {
      setCheckingAdmin(false);
    }
  }, [user]);

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data?.role === 'admin');
      }
    } catch (error) {
      console.error('Error:', error);
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  };

  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-accent" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Painel Administrativo
              </h1>
              <p className="text-muted-foreground">
                Gerencie a plataforma de sorteios
              </p>
            </div>
          </div>

          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="raffles">Edições</TabsTrigger>
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="winners">Ganhadores</TabsTrigger>
              <TabsTrigger value="instant-prizes">Instantâneos</TabsTrigger>
              <TabsTrigger value="palpiteco">Palpiteco</TabsTrigger>
              <TabsTrigger value="affiliates">Afiliados</TabsTrigger>
              <TabsTrigger value="settings">Config</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard">
              <AdminDashboard />
            </TabsContent>
            <TabsContent value="raffles">
              <RaffleManagement />
            </TabsContent>
            <TabsContent value="users">
              <UserManagement />
            </TabsContent>
            <TabsContent value="winners">
              <WinnerManagement />
            </TabsContent>
            <TabsContent value="instant-prizes">
              <InstantPrizesManagement />
            </TabsContent>
            <TabsContent value="palpiteco">
              <PalpitecoManagement />
            </TabsContent>
            <TabsContent value="affiliates">
              <div className="space-y-6">
                <AffiliateManagement />
                <AffiliateTestPanel />
              </div>
            </TabsContent>
            <TabsContent value="settings">
              <LotterySettings />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
