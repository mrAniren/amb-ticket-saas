import { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { Event, SessionWithDetails } from '../types/Event.types';

// Хук для получения всех мероприятий
export const useEvents = (activeOnly: boolean = true) => {
  const [data, setData] = useState<{ events: Event[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      // Очищаем старые данные перед загрузкой новых
      setData(null);
      const response = await apiClient.getEvents(activeOnly);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке мероприятий');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchEvents();
  };

  useEffect(() => {
    fetchEvents();
  }, [activeOnly]);

  return { data, loading, error, refetch };
};

// Хук для получения одного мероприятия
export const useEvent = (id: string | undefined) => {
  const [data, setData] = useState<{ event: Event } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvent = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getEvent(id);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке мероприятия');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchEvent();
  };

  useEffect(() => {
    fetchEvent();
  }, [id]);

  return { data, loading, error, refetch };
};

// Хук для получения сеансов мероприятия
export const useEventSessions = (eventId: string | undefined) => {
  const [data, setData] = useState<{ sessions: SessionWithDetails[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getEventSessions(eventId);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке сеансов');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchSessions();
  };

  useEffect(() => {
    fetchSessions();
  }, [eventId]);

  return { data, loading, error, refetch };
};

// Хук для получения всех сеансов
export const useSessions = () => {
  const [data, setData] = useState<{ sessions: SessionWithDetails[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getSessions();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке сеансов');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchSessions();
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return { data, loading, error, refetch };
};

// Хук для получения одного сеанса
export const useSession = (id: string | undefined) => {
  const [data, setData] = useState<{ session: SessionWithDetails } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getSession(id);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке сеанса');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchSession();
  };

  useEffect(() => {
    fetchSession();
  }, [id]);

  return { data, loading, error, refetch };
};
