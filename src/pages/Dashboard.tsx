
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import UserProfile from '@/components/dashboard/UserProfile';
import ActiveRaffles from '@/components/dashboard/ActiveRaffles';
import ParticipatedRaffles from '@/components/dashboard/ParticipatedRaffles';
import UrgencyAlerts from '@/components/dashboard/UrgencyAlerts';
import UserStats from '@/components/dashboard/UserStats';

interface UserProfile {
  full_name: string | null;
}

const Dashboard = () => {
  const { user, loading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
        return;
      }

      setUserProfile(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const displayName = userProfile?.full_name || user.email?.split('@')[0] || 'Usuário';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Olá, {displayName}!
          </h1>
          <p className="text-muted-foreground mb-8">
            Bem-vindo ao seu painel de controle
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna Principal */}
            <div className="lg:col-span-2 space-y-6">
              <UserProfile />
              <ParticipatedRaffles />
              <ActiveRaffles />
            </div>
            
            {/* Sidebar */}
            <div className="space-y-6">
              <UrgencyAlerts />
              <UserStats />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
