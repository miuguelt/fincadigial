import type { HistoryRecord } from '../types';

/** Los servicios devuelven `T[]`, pero algunos endpoints todavía envuelven en `{data}`. */
export const asList = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

/** Los enums del backend a veces llegan serializados como `{value}`. */
const enumValue = (raw: any): any => (raw && typeof raw === 'object' && 'value' in raw ? raw.value : raw);

const number = (raw: any, maximumFractionDigits = 1) =>
  Number(raw).toLocaleString('es-CO', { maximumFractionDigits });

export interface HistorySources {
  milk: any;
  transfers: any;
  diseases: any;
  treatments: any;
  finance: any;
  controls: any;
}

export interface HistoryCatalogs {
  animals: any[];
  fields: any[];
  diseases: any[];
  medications: any[];
}

function milkRecords(rows: any[], animalName: (id: number) => string): HistoryRecord[] {
  return rows.map(m => {
    const shift = m.milking_session === 'AM' ? 'Mañana' : m.milking_session === 'PM' ? 'Tarde' : 'Extra';
    return {
      id: `milking-${m.id}`, type: 'milking', date: m.date,
      animalId: m.animal_id, animalLabel: animalName(m.animal_id),
      details: `${number(m.liters)} litros (${shift})`, notes: m.notes, raw: m,
    };
  });
}

function transferRecords(rows: any[], animalName: (id: number) => string, fieldMap: Map<number, any>): HistoryRecord[] {
  return rows.map(tf => {
    const field = fieldMap.get(tf.field_id);
    return {
      id: `transfer-${tf.id}`, type: 'transfer', date: tf.assignment_date,
      animalId: tf.animal_id, animalLabel: animalName(tf.animal_id),
      entityId: tf.field_id, entityLabel: field?.name || `Potrero ${tf.field_id}`,
      details: `Trasladado al potrero ${field?.name || tf.field_id}`, notes: tf.notes, raw: tf,
    };
  });
}

function diseaseRecords(rows: any[], animalName: (id: number) => string, diseaseMap: Map<number, any>): HistoryRecord[] {
  return rows.map(da => {
    const disease = diseaseMap.get(da.disease_id);
    const name = disease?.name || da.disease?.name;
    return {
      id: `disease-${da.id}`, type: 'disease', date: da.diagnosis_date,
      animalId: da.animal_id, animalLabel: animalName(da.animal_id),
      entityId: da.disease_id, entityLabel: name || `Enfermedad ${da.disease_id}`,
      details: `${name || 'Diagnóstico'} · ${da.status || 'Activo'}`, notes: da.notes, raw: da,
    };
  });
}

function treatmentRecords(rows: any[], animalName: (id: number) => string, medMap: Map<number, any>): HistoryRecord[] {
  return rows.map(t => {
    // El medicamento vive en la tabla puente treatment_medications, no en una
    // columna de treatments: leerlo de `t.medication_id` siempre daba vacío.
    const link = t.medication_treatments?.[0];
    const medId = t.medication_id ?? link?.medication_id;
    const medName = (medId != null ? medMap.get(medId)?.name : undefined) || link?.medication?.name;
    return {
      id: `treatment-${t.id}`, type: 'treatment', date: t.treatment_date,
      animalId: t.animal_id, animalLabel: animalName(t.animal_id),
      entityId: medId, entityLabel: medName,
      details: [medName || 'Tratamiento', t.dosis || t.dose, t.frequency].filter(Boolean).join(' · '),
      notes: t.observations || t.description, raw: t,
    };
  });
}

function controlRecords(rows: any[], animalName: (id: number) => string): HistoryRecord[] {
  return rows.map(c => {
    const parts = [
      c.weight != null ? `Peso ${number(c.weight)} kg` : null,
      c.height != null ? `Alzada ${number(c.height)} cm` : null,
      `Estado ${enumValue(c.health_status)}`,
    ].filter(Boolean);
    return {
      id: `control-${c.id}`, type: 'control', date: c.checkup_date,
      animalId: c.animal_id, animalLabel: animalName(c.animal_id),
      details: parts.join(' · '), notes: c.description, raw: c,
    };
  });
}

function financeRecords(rows: any[], animalName: (id: number) => string): HistoryRecord[] {
  return rows.map(ft => {
    const txType = enumValue(ft.transaction_type);
    const category = enumValue(ft.category);
    return {
      id: `finance-${ft.id}`, type: 'finance', date: ft.date,
      animalId: ft.animal_id, animalLabel: ft.animal_id ? animalName(ft.animal_id) : undefined,
      details: `${txType}: $${Number(ft.amount).toLocaleString('es-CO')} (${category})`,
      notes: ft.description, raw: { ...ft, transaction_type: txType, category },
    };
  });
}

/**
 * Unifica en una sola línea de tiempo las seis fuentes del historial y las
 * ordena de más reciente a más antigua.
 */
export function buildHistoryRecords(sources: HistorySources, catalogs: HistoryCatalogs): HistoryRecord[] {
  const animalMap = new Map(catalogs.animals.map(a => [a.id, a]));
  const fieldMap = new Map(catalogs.fields.map(f => [f.id, f]));
  const diseaseMap = new Map(catalogs.diseases.map(d => [d.id, d]));
  const medMap = new Map(catalogs.medications.map(m => [m.id, m]));

  const animalName = (id: number) => {
    const a = animalMap.get(id);
    return a ? `${a.record} - ${a.breed?.name || 'Sin Raza'}` : `Animal ${id}`;
  };

  return [
    ...milkRecords(asList(sources.milk), animalName),
    ...transferRecords(asList(sources.transfers), animalName, fieldMap),
    ...diseaseRecords(asList(sources.diseases), animalName, diseaseMap),
    ...treatmentRecords(asList(sources.treatments), animalName, medMap),
    ...controlRecords(asList(sources.controls), animalName),
    ...financeRecords(asList(sources.finance), animalName),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
