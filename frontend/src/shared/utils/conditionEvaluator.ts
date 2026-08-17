/**
 * Utilidad para evaluar condiciones dinámicas definidas como strings (ej: "< 400", "== 'Malo'")
 */
export const evaluateCondition = (value: any, condition: string): boolean => {
  if (!condition) return false;

  // Limpiar espacios
  const cleanCondition = condition.trim();

  // Caso 1: Comparaciones numéricas (<, >, <=, >=, ==, !=)
  const numericMatch = cleanCondition.match(/^([<>!=]=?)\s*(.+)$/);
  if (numericMatch) {
    const operator = numericMatch[1];
    const thresholdStr = numericMatch[2].replace(/'|"/g, '');
    const threshold = parseFloat(thresholdStr);
    const numericValue = parseFloat(value);

    if (isNaN(numericValue) || isNaN(threshold)) {
      // Si no son números, intentamos comparación de strings si el operador es == o !=
      if (operator === '==' || operator === '===') return String(value) === thresholdStr;
      if (operator === '!=' || operator === '!==') return String(value) !== thresholdStr;
      return false;
    }

    switch (operator) {
      case '<': return numericValue < threshold;
      case '>': return numericValue > threshold;
      case '<=': return numericValue <= threshold;
      case '>=': return numericValue >= threshold;
      case '==':
      case '===': return numericValue === threshold;
      case '!=':
      case '!==': return numericValue !== threshold;
      default: return false;
    }
  }

  // Caso 2: Igualdad simple (si no hay operador)
  return String(value).toLowerCase() === cleanCondition.toLowerCase().replace(/'|"/g, '');
};

/**
 * Mapea una dimensión (string) a un valor real del objeto animal/control
 */
export const getValueByDimension = (
  animal: any,
  latestControl: any,
  dimension: string,
  extraData?: {
    milkHistory?: any[],
    fieldAssignments?: any[],
    vaccinations?: any[]
  }
): any => {
  const d = dimension.toLowerCase();

  // Atributos del Animal
  if (d === 'peso') return latestControl?.weight ?? animal.weight;
  if (d === 'altura') return latestControl?.height ?? animal.height;
  if (d === 'salud' || d === 'estado_salud') return latestControl?.health_status ?? latestControl?.healt_status ?? 'Sano';

  // Atributos calculados
  if (d === 'dias_sin_control') {
    const lastDate = latestControl?.checkup_date ?? latestControl?.control_date ?? animal.created_at;
    if (!lastDate) return 0;
    const diff = Date.now() - new Date(lastDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  if (d === 'edad_meses') return animal.age_in_months;

  // Rotación de Potreros
  if (d === 'dias_en_potrero') {
    const assignments = (extraData?.fieldAssignments || [])
      .filter(a => a.animal_id === animal.id)
      .sort((a, b) => new Date(b.created_at || b.assignment_date).getTime() - new Date(a.created_at || a.assignment_date).getTime());

    const latest = assignments[0];
    if (!latest) return 0;
    const diff = Date.now() - new Date(latest.created_at || latest.assignment_date).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  // Producción de Leche (Caída de rendimiento)
  if (d === 'rendimiento_leche_diario') {
    const history = (extraData?.milkHistory || [])
      .filter(m => m.animal_id === animal.id)
      .sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());

    if (history.length < 1) return 0;
    return history[0].liters || history[0].quantity || 0;
  }

  // Reproducción (Días desde último evento)
  if (d === 'dias_desde_parto' || d === 'dias_posparto') {
    return animal.days_since_last_calving || 0;
  }

  // Propiedad directa
  return animal[dimension] ?? latestControl?.[dimension];
};
