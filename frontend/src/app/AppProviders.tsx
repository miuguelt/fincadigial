import type { ReactNode } from 'react';
import { Fragment, StrictMode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from '@/app/providers/AuthenticationContext';
import { CacheProvider } from '@/app/providers/CacheContext';
import { SidebarProvider } from '@/app/providers/SidebarContext';
import { ThemeProvider } from '@/app/providers/ThemeContext';
import { ToastProvider } from '@/app/providers/ToastContext';
import { I18nProvider } from '@/shared/i18n';
import { InventoryProvider } from '@/app/providers/InventoryContext';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { OnlineStatusIndicator } from '@/shared/ui/common/OnlineStatusIndicator';
import { PWAUpdateHandler } from '@/shared/ui/common/PWAUpdateHandler';
import { Toaster } from '@/shared/ui/toaster';
import { GlobalNetworkHandlers } from './providers/GlobalNetworkHandlers';
import { queryClient } from './bootstrap/queryClient';

interface AppProvidersProps {
  strictMode?: boolean;
  children?: ReactNode;
}

export function AppProviders({
  strictMode = import.meta.env.VITE_ENABLE_STRICT_MODE === 'true',
  children,
}: AppProvidersProps) {
  const Wrapper = strictMode ? StrictMode : Fragment;

  return (
    <Wrapper>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <CacheProvider>
                <SidebarProvider>
                  <ThemeProvider>
                    <I18nProvider>
                      <ToastProvider>
                        <InventoryProvider>
                          <GlobalNetworkHandlers />
                          {children ?? <AppRoutes />}
                          <OnlineStatusIndicator />
                          <PWAUpdateHandler />
                          <Toaster />
                        </InventoryProvider>
                      </ToastProvider>
                    </I18nProvider>
                  </ThemeProvider>
                </SidebarProvider>
              </CacheProvider>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>
    </Wrapper>
  );
}
