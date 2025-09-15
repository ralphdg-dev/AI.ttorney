import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';

interface FavoritesContextType {
  favoriteTermIds: Set<string>;
  toggleFavorite: (termId: string, termTitle?: string) => Promise<void>;
  isFavorite: (termId: string) => boolean;
  getFavoriteCount: () => number;
  loadFavorites: () => Promise<void>;
}

interface FavoritesProviderProps {
  children: ReactNode;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
  const [favoriteTermIds, setFavoriteTermIds] = useState<Set<string>>(new Set());

  const loadFavorites = useCallback(async () => {
    try {
      // TODO: Replace with actual API call to load user's favorites
      // const { data, error } = await db.userPreferences.favorites.getAll();
      // if (data) {
      //   setFavoriteTermIds(new Set(data.map(fav => fav.glossary_id.toString())));
      // }
      
      // For now, load from sample data
      const sampleFavorites = new Set(['1', '4']); // Annulment and Probable Cause
      setFavoriteTermIds(sampleFavorites);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }, []);

  const toggleFavorite = useCallback(async (termId: string, termTitle?: string) => {
    try {
      const isCurrentlyFavorite = favoriteTermIds.has(termId);
      
      if (isCurrentlyFavorite) {
        // Remove from favorites
        // TODO: Replace with actual API call
        // await db.userPreferences.favorites.delete(termId);
        
        setFavoriteTermIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(termId);
          return newSet;
        });
        
        if (termTitle) {
          Alert.alert('Removed', `"${termTitle}" removed from favorites`);
        }
      } else {
        // Add to favorites
        // TODO: Replace with actual API call
        // await db.userPreferences.favorites.create({ user_id: userId, glossary_id: termId });
        
        setFavoriteTermIds(prev => new Set([...prev, termId]));
        
        if (termTitle) {
          Alert.alert('Added', `"${termTitle}" added to favorites`);
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorites');
    }
  }, [favoriteTermIds]);

  const isFavorite = useCallback((termId: string): boolean => {
    return favoriteTermIds.has(termId);
  }, [favoriteTermIds]);

  const getFavoriteCount = useCallback((): number => {
    return favoriteTermIds.size;
  }, [favoriteTermIds]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const value: FavoritesContextType = {
    favoriteTermIds,
    toggleFavorite,
    isFavorite,
    getFavoriteCount,
    loadFavorites,
  };

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
