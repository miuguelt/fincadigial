/**
 * Configuración centralizada de colores por raza para Finca Villa Luz OS.
 * Se utiliza para aplicar acentos visuales coherentes en tarjetas y detalles.
 */

export const BREED_COLORS: Record<string, string> = {
  // Razas Bovinas Comunes
  'Holstein': '#2563eb', // Azul
  'Angus': '#1f2937',    // Gris muy oscuro / Negro
  'Brahman': '#94a3b8',  // Gris plata
  'Jersey': '#b45309',   // Ámbar / Café
  'Hereford': '#991b1b', // Rojo oscuro
  'Simmental': '#ea580c', // Naranja
  'Brangus': '#374151',  // Gris oscuro
  'Gyr': '#f59e0b',      // Dorado / Amarillo
  'Girolando': '#0ea5e9', // Celeste
  'Normando': '#4d7c0f', // Verde oliva
  
  // Genéricos / Default
  'Cruce': '#6b7280',    // Gris
  'Desconocida': '#9ca3af',
  'Otro': '#6b7280',
};

/**
 * Obtiene el color de acento para una raza.
 * Si la raza no está mapeada, genera uno determinístico o devuelve el default.
 */
export const getBreedColor = (breedName?: string | null): string => {
  if (!breedName) return BREED_COLORS['Desconocida'];
  
  // Normalizar nombre (quitar espacios, tildes, etc.)
  const normalized = breedName.trim();
  
  // Búsqueda directa
  if (BREED_COLORS[normalized]) return BREED_COLORS[normalized];
  
  // Búsqueda parcial (ej: "Angus Rojo" -> "Angus")
  const key = Object.keys(BREED_COLORS).find(k => normalized.includes(k));
  if (key) return BREED_COLORS[key];

  return BREED_COLORS['Cruce'];
};
