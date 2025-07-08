
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import UserProfile from '@/components/dashboard/UserProfile';
import ActiveRaffles from '@/components/dashboard/ActiveRaffles';
import ParticipatedRaffles from '@/components/dashboard/ParticipatedRaffles';
import UrgencyAlerts from '@/components/dashboard/UrgencyAlerts';
import UserStats from '@/components/dashboard/UserStats';

const Dashboard = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-8">Meu Painel</h1>
          
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
