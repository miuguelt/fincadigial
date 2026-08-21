import { describe, expect, it } from 'vitest';
import {
  TAG_CAPACITIES,
  buildTagRecords,
  estimateNdefBytes,
  fitsInTag,
  parseAnimalSnapshot,
  type NfcTagAnimal,
} from './ndefPayload';

const animal: NfcTagAnimal = {
  id: 7261,
  record: 'BOV-010',
  fincaId: 3,
  sex: 'Hembra',
  birthDate: '2023-01-02',
  breedLabel: 'Holstein',
};

const origin = 'https://villaluz.example.co';

describe('buildTagRecords', () => {
  it('siempre incluye la URL de la ficha para celulares sin la aplicación', () => {
    const records = buildTagRecords(animal, { origin, includeSnapshot: false });
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual({
      recordType: 'url',
      data: `${origin}/scanner?id=7261`,
    });
  });

  it('agrega la ficha offline como registro externo cuando se pide', () => {
    const records = buildTagRecords(animal, { origin, includeSnapshot: true });
    expect(records).toHaveLength(2);
    expect(records[1].recordType).toBe('villaluz.co:animal');
    expect(records[1].data).toBe('VL1|7261|BOV-010|3|H|20230102|Holstein');
  });

  it('omite los campos vacíos sin desalinear las posiciones', () => {
    const records = buildTagRecords(
      { id: 12, record: 'BOV-3', fincaId: 1 },
      { origin, includeSnapshot: true }
    );
    expect(records[1].data).toBe('VL1|12|BOV-3|1|||');
  });

  it('ignora una fecha ya formateada en vez de grabar basura en el chip', () => {
    const records = buildTagRecords(
      { ...animal, birthDate: '2/1/2023' },
      { origin, includeSnapshot: true }
    );
    expect(records[1].data).toBe('VL1|7261|BOV-010|3|H||Holstein');
    expect(parseAnimalSnapshot(records[1].data)?.birthDate).toBeUndefined();
  });

  it('escapa el separador para que un nombre con barra no rompa el parseo', () => {
    const records = buildTagRecords(
      { ...animal, breedLabel: 'Holstein|Cruce' },
      { origin, includeSnapshot: true }
    );
    expect(parseAnimalSnapshot(records[1].data)?.breedLabel).toBe('Holstein|Cruce');
  });
});

describe('parseAnimalSnapshot', () => {
  it('reconstruye la ficha grabada en el chip', () => {
    const [, snapshot] = buildTagRecords(animal, { origin, includeSnapshot: true });
    expect(parseAnimalSnapshot(snapshot.data)).toEqual({
      id: 7261,
      record: 'BOV-010',
      fincaId: 3,
      sex: 'Hembra',
      birthDate: '2023-01-02',
      breedLabel: 'Holstein',
    });
  });

  it('devuelve null ante un contenido ajeno a Villa Luz', () => {
    expect(parseAnimalSnapshot('otra cosa cualquiera')).toBeNull();
  });

  it('devuelve null ante una versión de formato desconocida', () => {
    expect(parseAnimalSnapshot('VL9|1|A|1|H|20230102|X')).toBeNull();
  });
});

describe('estimateNdefBytes', () => {
  it('cuenta cabecera, tipo y contenido de cada registro', () => {
    // 1 registro URL: 3 de cabecera + 1 de tipo "U" + 1 de prefijo + resto de
    // la URL; más los 3 bytes del contenedor TLV del chip.
    const bytes = estimateNdefBytes([
      { recordType: 'url', data: 'https://villaluz.example.co/scanner?id=7261' },
    ]);
    expect(bytes).toBe(3 + 1 + 1 + 'villaluz.example.co/scanner?id=7261'.length + 3);
  });

  it('crece al incluir la ficha offline', () => {
    const soloUrl = estimateNdefBytes(buildTagRecords(animal, { origin, includeSnapshot: false }));
    const conFicha = estimateNdefBytes(buildTagRecords(animal, { origin, includeSnapshot: true }));
    expect(conFicha).toBeGreaterThan(soloUrl);
  });
});

describe('fitsInTag', () => {
  it('la ficha completa cabe en el arete NTAG213, el más común', () => {
    const bytes = estimateNdefBytes(buildTagRecords(animal, { origin, includeSnapshot: true }));
    expect(bytes).toBeLessThanOrEqual(TAG_CAPACITIES.NTAG213);
    expect(fitsInTag(bytes, 'NTAG213')).toBe(true);
  });

  it('rechaza lo que excede la capacidad declarada del chip', () => {
    expect(fitsInTag(TAG_CAPACITIES.NTAG213 + 1, 'NTAG213')).toBe(false);
  });
});
