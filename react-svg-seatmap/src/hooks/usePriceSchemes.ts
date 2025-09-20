import { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { PriceScheme } from '../types/PriceScheme.types';

interface UsePriceSchemesResult {
  data: { priceSchemes: PriceScheme[]; total: number } | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const usePriceSchemes = (): UsePriceSchemesResult => {
  const [data, setData] = useState<{ priceSchemes: PriceScheme[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiClient.getPriceSchemes();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке распаесовок');
      console.error('Ошибка загрузки распаесовок:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
};

interface UsePriceSchemeResult {
  data: PriceScheme | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const usePriceScheme = (id: string): UsePriceSchemeResult => {
  const [data, setData] = useState<PriceScheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiClient.getPriceScheme(id);
      setData(result.priceScheme);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке распаесовки');
      console.error('Ошибка загрузки распаесовки:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
};
