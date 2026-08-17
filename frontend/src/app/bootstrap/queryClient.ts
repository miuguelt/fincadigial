import { QueryClient } from '@tanstack/react-query';

/** Shared cache policy for every screen in the application. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // Una consulta invalidada debe volver a pedir datos al entrar de nuevo
      // a la pantalla; false dejaba estadísticas y listados con valores viejos.
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      networkMode: 'offlineFirst',
      throwOnError: false,
      refetchInterval: false,
      refetchIntervalInBackground: false,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      networkMode: 'online',
      onMutate: undefined,
    },
  },
});
