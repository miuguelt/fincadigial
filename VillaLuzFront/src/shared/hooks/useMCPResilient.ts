/**
 * Hook useMCPResilient
 * 
 * Hook React para integrar MCP Resilient Client de forma sencilla
 * en componentes del dashboard.
 * 
 * @example
 * ```tsx
 * const HealthStatusWidget = () => {
 *   const { execute, isAvailable, status, isLoading } = useMCPResilient({
 *     mcpName: 'devbrain-universal',
 *     toolName: 'dashboard_status',
 *     fallbackFn: async () => {
 *       const res = await fetch('/api/v1/health');
 *       return await res.json();
 *     }
 *   });
 * 
 *   useEffect(() => {
 *     execute({ verbose: true });
 *   }, []);
 * 
 *   if (isLoading) return <Spinner />;
 *   if (!isAvailable) return <Badge>Usando Fallback</Badge>;
 *   return <StatusDisplay data={data} />;
 * };
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { mcpResilientClient, type MCPResult } from '@/shared/api/mcpResilientClient';

interface UseMCPResilientOptions<T, P = Record<string, any>> {
  /** Nombre del servidor MCP */
  mcpName: string;
  
  /** Nombre de la herramienta MCP */
  toolName: string;
  
  /** Función fallback cuando MCP falla */
  fallbackFn: (params?: P) => Promise<T>;
  
  /** Parámetros iniciales (opcional) */
  initialParams?: P;
  
  /** Si ejecutar automáticamente al montar */
  autoExecute?: boolean;
  
  /** Timeout para la llamada */
  timeout?: number;
}

interface UseMCPResilientReturn<T, P = Record<string, any>> {
  /** Datos obtenidos (de MCP o fallback) */
  data: T | null;
  
  /** Si está cargando */
  isLoading: boolean;
  
  /** Error si ambos MCP y fallback fallaron */
  error: string | null;
  
  /** Fuente de los datos: 'mcp' | 'fallback' | null */
  source: 'mcp' | 'fallback' | null;
  
  /** Si el MCP está disponible */
  isAvailable: boolean;
  
  /** Si está usando fallback actualmente */
  isFallback: boolean;
  
  /** Estado completo del MCP */
  status: ReturnType<typeof mcpResilientClient.getStatus>;
  
  /** Ejecutar la llamada con parámetros opcionales */
  execute: (params?: P) => Promise<MCPResult<T>>;
  
  /** Reintentar la última llamada */
  retry: () => Promise<MCPResult<T>>;
  
  /** Intentar recuperar el MCP del cooldown */
  attemptRecovery: () => Promise<boolean>;
  
  /** Tiempo de ejecución de la última llamada (ms) */
  lastDuration: number | null;
}

export function useMCPResilient<T, P extends Record<string, any> = Record<string, any>>(
  options: UseMCPResilientOptions<T, P>
): UseMCPResilientReturn<T, P> {
  const {
    mcpName,
    toolName,
    fallbackFn,
    initialParams,
    autoExecute = false,
    timeout = 5000
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'mcp' | 'fallback' | null>(null);
  const [lastDuration, setLastDuration] = useState<number | null>(null);
  const [lastParams, setLastParams] = useState<P | undefined>(initialParams);

  // Usar ref para mantener referencia actualizada de lastParams
  const lastParamsRef = useRef(lastParams);
  lastParamsRef.current = lastParams;

  const status = mcpResilientClient.getStatus(mcpName);
  const isAvailable = mcpResilientClient.isAvailable(mcpName);
  const isFallback = status?.fallbackActive ?? false;

  const execute = useCallback(async (params?: P): Promise<MCPResult<T>> => {
    setIsLoading(true);
    setError(null);
    
    // Guardar parámetros para retry
    if (params) {
      setLastParams(params);
    }

    try {
      const result = await mcpResilientClient.executeWithFallback<T>({
        mcpName,
        toolName,
        params: params || lastParamsRef.current,
        fallbackFn,
        timeout
      });

      setData(result.data);
      setSource(result.source);
      setLastDuration(result.duration);
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [mcpName, toolName, fallbackFn, timeout]);

  const retry = useCallback(() => {
    // Resetear estado del MCP para permitir reintento
    mcpResilientClient.resetStatus(mcpName);
    return execute(lastParamsRef.current);
  }, [execute, mcpName]);

  const attemptRecovery = useCallback(async () => {
    return await mcpResilientClient.attemptRecovery(mcpName);
  }, [mcpName]);

  // Auto-ejecutar al montar si está habilitado
  useEffect(() => {
    if (autoExecute && initialParams !== undefined) {
      execute(initialParams).catch(() => {
        // Error ya está en estado, no necesitamos hacer nada más
      });
    }
  }, [autoExecute, execute, initialParams]);

  return {
    data,
    isLoading,
    error,
    source,
    isAvailable,
    isFallback,
    status,
    execute,
    retry,
    attemptRecovery,
    lastDuration
  };
}

/**
 * Hook useMCPHealth - Monitorear salud de MCPs del sistema
 * 
 * @example
 * ```tsx
 * const SystemHealth = () => {
 *   const { status, allStatus } = useMCPHealth();
 *   
 *   return (
 *     <div>
 *       {Object.entries(allStatus).map(([name, s]) => (
 *         <Badge key={name} color={s.available ? 'green' : 'red'}>
 *           {name}: {s.available ? 'OK' : 'Fallback'}
 *         </Badge>
 *       ))}
 *     </div>
 *   );
 * };
 * ```
 */
export function useMCPHealth() {
  const [allStatus, setAllStatus] = useState(() => 
    mcpResilientClient.getAllStatus()
  );
  
  const [refreshKey, setRefreshKey] = useState(0);

  // Refrescar estado periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      setAllStatus(mcpResilientClient.getAllStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Refrescar manualmente
  const refresh = useCallback(() => {
    setAllStatus(mcpResilientClient.getAllStatus());
    setRefreshKey(k => k + 1);
  }, []);

  const universalStatus = allStatus['devbrain-universal'];
  const skillTestStatus = allStatus['devbrain-skill-test-skill-v2'];
  
  const anyAvailable = Object.values(allStatus).some(s => s.available);
  const allInFallback = Object.values(allStatus).every(s => s.fallbackActive);

  return {
    allStatus,
    universalStatus,
    skillTestStatus,
    anyAvailable,
    allInFallback,
    refresh,
    refreshKey
  };
}
