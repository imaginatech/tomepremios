import React, { createContext, useContext, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingContextType {
  triggerLoading: (callback: () => void) => void;
}

const LoadingContext = createContext<LoadingContextType>({ triggerLoading: () => {} });

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const callbackRef = React.useRef<(() => void) | null>(null);

  const triggerLoading = useCallback((callback: () => void) => {
    callbackRef.current = callback;
    setLoading(true);
    setProgress(0);

    const totalTime = 12000 + Math.random() * 5000; // 12-17s for navigation
    const interval = 200;
    const steps = totalTime / interval;
    let current = 0;

    const timer = setInterval(() => {
      current++;
      const raw = current / steps;
      const simulated = Math.min(
        raw < 0.7 ? raw * 0.8 : 0.56 + (raw - 0.7) * 1.47,
        0.99
      );
      setProgress(Math.round(simulated * 100));

      if (current >= steps) {
        setProgress(100);
        clearInterval(timer);
        setTimeout(() => {
          setLoading(false);
          callbackRef.current?.();
          callbackRef.current = null;
        }, 300);
      }
    }, interval);
  }, []);

  return (
    <LoadingContext.Provider value={{ triggerLoading }}>
      {children}
      {loading && (
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
      )}
    </LoadingContext.Provider>
  );
};
