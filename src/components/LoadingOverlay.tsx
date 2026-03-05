import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const LoadingOverlay = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate 20-25 seconds delay (random between 20000-25000ms)
    const totalTime = 20000 + Math.random() * 5000;
    const interval = 200;
    const steps = totalTime / interval;
    let current = 0;

    const timer = setInterval(() => {
      current++;
      // Non-linear progress to feel more realistic
      const rawProgress = current / steps;
      const simulatedProgress = Math.min(
        rawProgress < 0.7
          ? rawProgress * 0.8
          : 0.56 + (rawProgress - 0.7) * 1.47,
        0.99
      );
      setProgress(Math.round(simulatedProgress * 100));

      if (current >= steps) {
        setProgress(100);
        clearInterval(timer);
        setTimeout(() => setLoading(false), 300);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  if (!loading) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center gap-6">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <div className="text-center space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Carregando...</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Servidor sobrecarregado. Por favor, aguarde enquanto processamos sua solicitação.
        </p>
        <div className="w-64 h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-200 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{progress}%</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
