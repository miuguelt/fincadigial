import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Star, Clock, Menu, X } from 'lucide-react';
import { navigationService } from '@/entities/navigation/api/navigation.service';
import { preferencesService } from '@/entities/preferences/api/preferences.service';
import { useToast } from '@/app/providers/ToastContext';
import { useAuth } from '@/features/auth/model/useAuth';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import QuickStats from '@/widgets/dashboard/QuickStats';

interface NavigationGroup {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  endpoints: Array<{
    method: string;
    path: string;
    description: string;
    requires_auth: boolean;
    permissions: string[];
  }>;
  count: number;
}

export default function NavigationSidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [navigation, setNavigation] = useState<NavigationGroup[] | null>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const loadNavigation = async () => {
    setLoading(true);
    try {
      const response = await navigationService.getStructure();
      setNavigation(response.groups);
    } catch (error) {
      console.error('Error loading navigation:', error);
      // Fallback to hardcoded navigation if API fails
      setNavigation(getFallbackNavigation());
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const response = await preferencesService.getFavorites();
      setFavorites(response);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await preferencesService.getHistory(10);
      setHistory(response);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  useEffect(() => {
    loadNavigation();
    if (user) {
      loadFavorites();
      loadHistory();
    }
  }, [user]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const addToFavorites = async (endpoint: string, label: string) => {
    try {
      await preferencesService.addFavorite({
        endpoint,
        label,
        method: 'GET'
      });
      loadFavorites();
      showToast('Agregado a favoritos', 'success');
    } catch (error) {
      console.error('Error adding favorite:', error);
      showToast('Error al agregar a favoritos', 'error');
    }
  };

  const getFallbackNavigation = (): NavigationGroup[] => {
    // Fallback navigation if API fails
    return [
      {
        id: 'dashboard',
        name: '🏠 Dashboard',
        description: 'Panel principal',
        icon: '🏠',
        path: '/dashboard',
        endpoints: [],
        count: 1
      },
      {
        id: 'animals',
        name: '🐄 Animales',
        description: 'Gestión de animales',
        icon: '🐄',
        path: '/admin/animals',
        endpoints: [],
        count: 8
      },
      {
        id: 'reproduction',
        name: '💕 Reproducción',
        description: 'Gestión reproductiva',
        icon: '💕',
        path: '/admin/reproduction',
        endpoints: [],
        count: 4
      },
      {
        id: 'health',
        name: '🏥 Salud',
        description: 'Salud animal',
        icon: '🏥',
        path: '/admin/treatments',
        endpoints: [],
        count: 6
      }
    ];
  };

  const isFavorite = (path: string) => {
    return favorites.some(f => f.endpoint === path);
  };

  if (loading) {
    return (
      <aside className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 text-2xl font-bold">FincaApp</div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X /> : <Menu />}
      </Button>

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gray-800 text-white flex flex-col transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-4 text-2xl font-bold flex items-center justify-between">
          <span>FincaApp</span>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMobileOpen(false)}>
            <X />
          </Button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
          {/* Quick Stats */}
          <QuickStats />

          {/* Favorites */}
          {favorites.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-400">
                <Star className="h-4 w-4" />
                Favoritos
              </div>
              {favorites.slice(0, 5).map(fav => (
                <NavLink
                  key={fav.id}
                  to={fav.endpoint}
                  className={({ isActive }) =>
                    `block px-4 py-2 rounded-md text-sm hover:bg-gray-700 ${isActive ? 'bg-gray-900' : ''}`
                  }
                  onClick={() => setIsMobileOpen(false)}
                >
                  {fav.label}
                </NavLink>
              ))}
            </div>
          )}

          {/* Recent History */}
          {history.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-400">
                <Clock className="h-4 w-4" />
                Recientes
              </div>
              {history.slice(0, 5).map(item => (
                <NavLink
                  key={item.id}
                  to={item.endpoint}
                  className="block px-4 py-2 rounded-md text-sm hover:bg-gray-700"
                  onClick={() => setIsMobileOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}

          {/* Navigation Groups */}
          {navigation?.map(group => (
            <div key={group.id}>
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-gray-700 rounded-md"
              >
                <span className="flex items-center gap-2">
                  <span>{group.icon}</span>
                  <span>{group.name}</span>
                </span>
                {collapsedGroups[group.id] ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {!collapsedGroups[group.id] && (
                <div className="pl-4 space-y-1">
                  {group.endpoints.slice(0, 5).map(endpoint => (
                    <NavLink
                      key={`${group.id}-${endpoint.path}`}
                      to={`${group.path}${endpoint.path}`}
                      className={({ isActive }) =>
                        `block px-3 py-2 rounded-md text-sm hover:bg-gray-700 ${isActive ? 'bg-gray-900' : ''}`
                      }
                      onClick={() => setIsMobileOpen(false)}
                    >
                      <div className="flex items-center justify-between">
                        <span>{endpoint.description}</span>
                        {isFavorite(`${group.path}${endpoint.path}`) && (
                          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        )}
                      </div>
                    </NavLink>
                  ))}
                  {group.count > 5 && (
                    <div className="px-3 py-1 text-xs text-gray-400">
                      +{group.count - 5} más
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User info */}
        {user && (
          <div className="p-4 border-t border-gray-700">
            <div className="text-sm">
              <p className="font-medium">{user.fullname || user.identification}</p>
              <p className="text-gray-400 text-xs">{user.role}</p>
            </div>
          </div>
        )}
      </aside>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}
