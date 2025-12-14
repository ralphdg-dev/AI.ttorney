import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { NetworkConfig } from '@/utils/networkConfig';
import { useToast } from '@/components/ui/toast';
import { createSafeAreaToastRenderer } from '@/components/ui/SafeAreaToast';
import { AppState, AppStateStatus } from 'react-native';

export interface FavoritesContextType {
  favoriteTermIds: Set<string>;
  toggleFavorite: (termId: string, termTitle?: string) => Promise<void>;
  isFavorite: (termId: string) => boolean;
  loadFavorites: () => Promise<void>;
}

interface FavoritesProviderProps {
  children: ReactNode;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
  const [favoriteTermIds, setFavoriteTermIds] = useState<Set<string>>(new Set());
  const { session } = useAuth();
  const toast = useToast();

  const loadFavorites = useCallback(async () => {
    if (!session?.access_token) {
      setFavoriteTermIds(new Set());
      return;
    }

    try {
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/api/user/favorites/terms`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const ids = new Set<string>(data.map((fav: any) => fav.glossary_id.toString()));
        setFavoriteTermIds(ids);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }, [session?.access_token]);

  const toggleFavorite = useCallback(async (termId: string, termTitle?: string) => {
    try {
      if (!session?.access_token) {
        toast.show({
          placement: 'top',
          duration: 2000,
          render: createSafeAreaToastRenderer('top', 'muted', 'outline', 'Login required'),
        });
        return;
      }

      const isCurrentlyFavorite = favoriteTermIds.has(termId);
      
      // Optimistic update
      if (isCurrentlyFavorite) {
        setFavoriteTermIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(termId);
          return newSet;
        });
      } else {
        setFavoriteTermIds(prev => new Set([...prev, termId]));
      }
      
      // API call
      const apiUrl = await NetworkConfig.getBestApiUrl();
      if (isCurrentlyFavorite) {
        const response = await fetch(`${apiUrl}/api/user/favorites/terms/${termId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          setFavoriteTermIds(prev => new Set([...prev, termId]));
          toast.show({
            placement: 'top',
            duration: 2000,
            render: createSafeAreaToastRenderer('top', 'error', 'outline', 'Failed to remove'),
          });
        }
      } else {
        const response = await fetch(`${apiUrl}/api/user/favorites/terms`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ glossary_id: termId }),
        });

        if (!response.ok && response.status !== 409) {
          setFavoriteTermIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(termId);
            return newSet;
          });
          toast.show({
            placement: 'top',
            duration: 2000,
            render: createSafeAreaToastRenderer('top', 'error', 'outline', 'Failed to add'),
          });
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [favoriteTermIds, session, toast]);

  const isFavorite = useCallback((termId: string): boolean => {
    return favoriteTermIds.has(termId);
  }, [favoriteTermIds]);

  useEffect(() => {
    loadFavorites();

    // App state listener - refresh when app comes to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('📱 FavoritesContext: App came to foreground, refreshing favorite terms');
        loadFavorites();
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Periodic refresh to prevent stale counts (every 2 minutes)
    const periodicRefresh = setInterval(() => {
      console.log("⏰ FavoritesContext: Periodic refresh to prevent stale favorite terms");
      loadFavorites();
    }, 2 * 60 * 1000); // 2 minutes

    return () => {
      appStateSubscription?.remove();
      clearInterval(periodicRefresh);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  const value: FavoritesContextType = React.useMemo(() => ({
    favoriteTermIds,
    toggleFavorite,
    isFavorite,
    loadFavorites,
  }), [favoriteTermIds, toggleFavorite, isFavorite, loadFavorites]);

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextType => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
