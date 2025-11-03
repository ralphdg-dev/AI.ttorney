import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { NetworkConfig } from '@/utils/networkConfig';
import { useToast, Toast, ToastTitle } from '@/components/ui/toast';

const API_BASE_URL = NetworkConfig.getApiUrl();

interface FavoritesContextType {
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
      const response = await fetch(`${API_BASE_URL}/api/user/favorites/terms`, {
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
          render: ({ id }) => (
            <Toast nativeID={id} action="muted" variant="outline">
              <ToastTitle>Login required</ToastTitle>
            </Toast>
          ),
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
      if (isCurrentlyFavorite) {
        const response = await fetch(`${API_BASE_URL}/api/user/favorites/terms/${termId}`, {
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
            render: ({ id }) => (
              <Toast nativeID={id} action="error" variant="outline">
                <ToastTitle>Failed to remove</ToastTitle>
              </Toast>
            ),
          });
        }
      } else {
        const response = await fetch(`${API_BASE_URL}/api/user/favorites/terms`, {
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
            render: ({ id }) => (
              <Toast nativeID={id} action="error" variant="outline">
                <ToastTitle>Failed to add</ToastTitle>
              </Toast>
            ),
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
