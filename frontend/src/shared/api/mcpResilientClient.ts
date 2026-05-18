/**
 * MCP Resilient Client
 * 
 * Wrapper que detecta caídas de MCP (Model Context Protocol) y usa fallback automáticamente.
 * Este cliente implementa graceful degradation cuando los servicios MCP de DevBrain no están disponibles.
 * 
 * @example
 * ```typescript
 * import { mcpResilientClient } from '@/shared/api/mcpResilientClient';
 * 
 * // Usar con fallback
 * const result = await mcpResilientClient.executeWithFallback(
 *   'devbrain-universal',
 *   'dashboard_status',
 *   {},
 *   async () => {
 *     // Fallback: usar API REST directamente
 *     return await fetch('/api/health').then(r => r.json());
 *   }
 * );
 * ```
 */

import { runCommand } from '@/shared/utils/shell';
import { readFile, writeFile } from '@/shared/utils/fs';

/**
 * Estado de un MCP
 */
interface MCPStatus {
  /** Si el MCP está disponible para llamadas */
  available: boolean;
  
  /** Último error recibido */
  lastError?: string;
  
  /** Última vez que respondió exitosamente */
  lastSuccess?: Date;
  
  /** Si está usando fallback actualmente */
  fallbackActive: boolean;
  
  /** Número de intentos fallidos consecutivos */
  consecutiveFailures: number;
  
  /** Tiempo de cooldown antes de reintentar (ms) */
  cooldownUntil?: Date;
}

/**
 * Opciones para ejecutar una herramienta MCP
 */
interface MCPExecuteOptions<T> {
  /** Nombre del servidor MCP */
  mcpName: string;
  
  /** Nombre de la herramienta a ejecutar */
  toolName: string;
  
  /** Parámetros para la herramienta */
  params?: Record<string, any>;
  
  /** Función fallback a ejecutar si MCP falla */
  fallbackFn: () => Promise<T>;
  
  /** Si forzar usar fallback (ignora MCP disponible) */
  forceFallback?: boolean;
  
  /** Timeout para la llamada MCP (ms) */
  timeout?: number;
}

/**
 * Resultado de ejecución MCP
 */
interface MCPResult<T> {
  /** Datos retornados */
  data: T;
  
  /** Si vino del MCP o del fallback */
  source: 'mcp' | 'fallback';
  
  /** Tiempo de ejecución (ms) */
  duration: number;
  
  /** Error si hubo (solo si fallback también falló) */
  error?: string;
}

/**
 * Cliente resiliente para MCPs con fallback automático
 */
class MCPResilientClient {
  private status: Map<string, MCPStatus> = new Map();
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly COOLDOWN_PERIOD_MS = 60000; // 1 minuto de cooldown
  private readonly DEFAULT_TIMEOUT = 5000; // 5 segundos
  
  constructor() {
    // Inicializar estado para MCPs conocidos
    this.initStatus('devbrain-universal');
    this.initStatus('devbrain-skill-test-skill-v2');
    
    console.log('[MCP-Resilient] Cliente inicializado');
  }
  
  /**
   * Inicializa estado para un MCP
   */
  private initStatus(mcpName: string): void {
    this.status.set(mcpName, {
      available: true, // Asumir disponible hasta probar
      fallbackActive: false,
      consecutiveFailures: 0
    });
  }
  
  /**
   * Ejecuta una herramienta MCP con fallback automático
   * 
   * @template T Tipo de retorno esperado
   * @param options Opciones de ejecución
   * @returns Resultado de MCP o fallback
   */
  async executeWithFallback<T>(options: MCPExecuteOptions<T>): Promise<MCPResult<T>> {
    const { mcpName, toolName, params = {}, fallbackFn, forceFallback = false, timeout = this.DEFAULT_TIMEOUT } = options;
    
    const startTime = performance.now();
    
    // Verificar si debemos intentar MCP o ir directo a fallback
    if (forceFallback || !this.shouldTryMCP(mcpName)) {
      console.log(`[MCP-Resilient] ${mcpName}.${toolName}: Usando fallback (force=${forceFallback}, cooldown=${this.isInCooldown(mcpName)})`);
      return this.executeFallback(fallbackFn, startTime);
    }
    
    try {
      // Intentar usar el MCP
      const result = await this.executeMCPTool<T>(mcpName, toolName, params, timeout);
      
      // Éxito: actualizar estado
      this.updateStatus(mcpName, {
        available: true,
        lastSuccess: new Date(),
        fallbackActive: false,
        consecutiveFailures: 0,
        cooldownUntil: undefined
      });
      
      const duration = Math.round(performance.now() - startTime);
      console.log(`[MCP-Resilient] ${mcpName}.${toolName}: ✓ Éxito (${duration}ms)`);
      
      return {
        data: result,
        source: 'mcp',
        duration
      };
      
    } catch (error) {
      // MCP falló: registrar y usar fallback
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`[MCP-Resilient] ${mcpName}.${toolName}: ✗ Falló - ${errorMsg}`);
      
      // Actualizar estado de fallo
      const currentStatus = this.status.get(mcpName)!;
      const newFailures = currentStatus.consecutiveFailures + 1;
      
      this.updateStatus(mcpName, {
        available: false,
        lastError: errorMsg,
        fallbackActive: true,
        consecutiveFailures: newFailures,
        // Activar cooldown si superamos el máximo de fallos
        cooldownUntil: newFailures >= this.MAX_CONSECUTIVE_FAILURES 
          ? new Date(Date.now() + this.COOLDOWN_PERIOD_MS) 
          : undefined
      });
      
      // Ejecutar fallback
      return this.executeFallback(fallbackFn, startTime, errorMsg);
    }
  }
  
  /**
   * Determina si debe intentar usar el MCP o ir a fallback
   */
  private shouldTryMCP(mcpName: string): boolean {
    const status = this.status.get(mcpName);
    if (!status) return true;
    
    // Si está en cooldown, no intentar
    if (this.isInCooldown(mcpName)) {
      return false;
    }
    
    // Si ha fallado muchas veces, no intentar
    if (status.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Verifica si un MCP está en período de cooldown
   */
  private isInCooldown(mcpName: string): boolean {
    const status = this.status.get(mcpName);
    if (!status?.cooldownUntil) return false;
    
    return new Date() < status.cooldownUntil;
  }
  
  /**
   * Ejecuta el fallback y retorna resultado
   */
  private async executeFallback<T>(
    fallbackFn: () => Promise<T>, 
    startTime: number,
    originalError?: string
  ): Promise<MCPResult<T>> {
    try {
      const result = await fallbackFn();
      const duration = Math.round(performance.now() - startTime);
      
      console.log(`[MCP-Resilient] Fallback: ✓ Éxito (${duration}ms)`);
      
      return {
        data: result,
        source: 'fallback',
        duration,
        error: originalError // Incluir error original como contexto
      };
      
    } catch (fallbackError) {
      const duration = Math.round(performance.now() - startTime);
      const fallbackErrorMsg = fallbackError instanceof Error 
        ? fallbackError.message 
        : String(fallbackError);
      
      console.error(`[MCP-Resilient] Fallback: ✗ Falló - ${fallbackErrorMsg}`);
      
      // Ambos fallaron: propagar error
      throw new Error(
        `MCP y fallback fallaron. ` +
        `MCP error: ${originalError || 'N/A'}. ` +
        `Fallback error: ${fallbackErrorMsg}`
      );
    }
  }
  
  /**
   * Ejecuta una herramienta MCP
   * 
   * NOTA: Esta es una implementación simulada. En producción real,
   * aquí se integraría con el SDK oficial de MCP.
   */
  private async executeMCPTool<T>(
    mcpName: string,
    toolName: string,
    params: Record<string, any>,
    timeout: number
  ): Promise<T> {
    // Aquí iría la integración real con MCP SDK
    // Por ahora simula un fallo para demostrar el fallback
    
    // Simulación: siempre falla para demostrar graceful degradation
    // En implementación real, esto llamaría al transporte MCP
    throw new Error(`MCP transport closed: ${mcpName}.${toolName}`);
    
    /*
    // Implementación real sería algo como:
    const client = await this.getMCPClient(mcpName);
    const result = await Promise.race([
      client.callTool(toolName, params),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MCP timeout')), timeout)
      )
    ]);
    return result as T;
    */
  }
  
  /**
   * Actualiza el estado de un MCP
   */
  private updateStatus(mcpName: string, updates: Partial<MCPStatus>): void {
    const current = this.status.get(mcpName) || {
      available: true,
      fallbackActive: false,
      consecutiveFailures: 0
    };
    
    this.status.set(mcpName, { ...current, ...updates });
  }
  
  /**
   * Verifica si un MCP está marcado como disponible
   */
  isAvailable(mcpName: string): boolean {
    return this.status.get(mcpName)?.available ?? false;
  }
  
  /**
   * Obtiene el estado completo de todos los MCPs
   */
  getAllStatus(): Record<string, MCPStatus> {
    return Object.fromEntries(this.status);
  }
  
  /**
   * Obtiene estado de un MCP específico
   */
  getStatus(mcpName: string): MCPStatus | undefined {
    return this.status.get(mcpName);
  }
  
  /**
   * Fuerza un reset del estado de un MCP (útil para reintentos manuales)
   */
  resetStatus(mcpName: string): void {
    this.initStatus(mcpName);
    console.log(`[MCP-Resilient] ${mcpName}: Estado reseteado`);
  }
  
  /**
   * Intenta recuperar un MCP del cooldown
   */
  async attemptRecovery(mcpName: string): Promise<boolean> {
    const status = this.status.get(mcpName);
    if (!status) return false;
    
    console.log(`[MCP-Resilient] ${mcpName}: Intentando recuperación...`);
    
    // Resetear estado
    this.resetStatus(mcpName);
    
    // Aquí podría hacer un health check real
    // Por ahora simulamos que la recuperación fue exitosa
    this.updateStatus(mcpName, {
      available: true,
      lastSuccess: new Date()
    });
    
    return true;
  }
}

// Exportar singleton
export const mcpResilientClient = new MCPResilientClient();

// Exportar tipos
export type { MCPStatus, MCPExecuteOptions, MCPResult };
