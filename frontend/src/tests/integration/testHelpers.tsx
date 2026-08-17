import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthenticationContext'
import { CacheProvider } from '@/app/providers/CacheContext'
import { SidebarProvider } from '@/app/providers/SidebarContext'
import { ThemeProvider } from '@/app/providers/ThemeContext'
import { I18nProvider } from '@/shared/i18n'
import { ToastProvider } from '@/app/providers/ToastContext'
import { InventoryProvider } from '@/app/providers/InventoryContext'
import { FieldModeProvider } from '@/app/providers/FieldModeContext'

// Stub BroadcastChannel for test environment if not defined
if (typeof window !== 'undefined' && !(window as any).BroadcastChannel) {
  class MockBroadcastChannel {
    name: string
    onmessage: ((ev: MessageEvent) => any) | null = null
    constructor(name: string) { this.name = name }
    postMessage(_msg: any) { /* noop */ }
    close() { /* noop */ }
  }
  (window as any).BroadcastChannel = MockBroadcastChannel
}

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  })

  // Simular sesión activa de navegador y usuario administrador persistido en localStorage
  if (typeof window !== 'undefined' && window.localStorage && window.sessionStorage) {
    const mockUser = {
      id: 1,
      username: 'admin',
      fullname: 'Administrador Sistema',
      role: 'Administrador',
      finca_id: 1
    }
    const ts = Date.now()

    window.sessionStorage.setItem('auth:session_active', '1')
    window.localStorage.setItem('auth:session_active', '1')
    window.localStorage.setItem('auth:user', JSON.stringify({ user: mockUser, ts }))
    window.localStorage.setItem('auth:user:cache', JSON.stringify({ user: mockUser, cachedAt: ts }))
    window.localStorage.setItem('auth:recent_ts', String(ts))
  }

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <CacheProvider>
            <SidebarProvider>
              <ThemeProvider>
                <I18nProvider>
                  <ToastProvider>
                    <InventoryProvider>
                      <FieldModeProvider>
                        {children}
                      </FieldModeProvider>
                    </InventoryProvider>
                  </ToastProvider>
                </I18nProvider>
              </ThemeProvider>
            </SidebarProvider>
          </CacheProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}
