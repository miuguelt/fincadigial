import { describe, expect, it } from 'vitest';
import { createSession, nfcSessionReducer } from './nfcSession';
import type { NfcSessionState, NfcTagAnimal } from './types';

const animals: NfcTagAnimal[] = [
  { id: 1, record: 'BOV-010', fincaId: 3 },
  { id: 2, record: 'BOV-015', fincaId: 3 },
];

const started = (): NfcSessionState =>
  nfcSessionReducer(createSession(animals), { type: 'start' });

const writeCurrent = (state: NfcSessionState, uid = '04A2241AB35C80') =>
  nfcSessionReducer(nfcSessionReducer(state, { type: 'tag-detected', uid }), {
    type: 'write-succeeded',
    uid,
    verifyAfterWrite: false,
  });

describe('createSession', () => {
  it('deja todos los animales pendientes y la sesión detenida', () => {
    const state = createSession(animals);
    expect(state.phase).toBe('idle');
    expect(state.targets.map((t) => t.status)).toEqual(['pending', 'pending']);
  });
});

describe('avance de la fila', () => {
  it('al arrancar activa el primer animal y pide acercar el arete', () => {
    const state = started();
    expect(state.phase).toBe('waiting');
    expect(state.activeIndex).toBe(0);
    expect(state.targets[0].status).toBe('active');
    expect(state.instruction).toContain('BOV-010');
  });

  it('pasa solo al siguiente animal cuando el arete queda grabado', () => {
    const state = writeCurrent(started());
    expect(state.targets[0].status).toBe('written');
    expect(state.targets[0].uid).toBe('04A2241AB35C80');
    expect(state.activeIndex).toBe(1);
    expect(state.phase).toBe('waiting');
  });

  it('termina la jornada cuando no queda ningún animal por marcar', () => {
    const state = writeCurrent(writeCurrent(started(), 'AAAAAAAA'), 'BBBBBBBB');
    expect(state.phase).toBe('finished');
    expect(state.targets.every((t) => t.status === 'written')).toBe(true);
  });

  it('omitir un animal lo saca de la fila sin marcarlo como error', () => {
    const state = nfcSessionReducer(started(), { type: 'skip' });
    expect(state.targets[0].status).toBe('skipped');
    expect(state.activeIndex).toBe(1);
  });
});

describe('verificación', () => {
  it('espera la relectura del arete antes de dar por bueno el marcaje', () => {
    const detected = nfcSessionReducer(started(), {
      type: 'tag-detected',
      uid: '04A2241AB35C80',
    });
    const written = nfcSessionReducer(detected, {
      type: 'write-succeeded',
      uid: '04A2241AB35C80',
      verifyAfterWrite: true,
    });
    expect(written.phase).toBe('verifying');
    expect(written.targets[0].status).toBe('active');

    const verified = nfcSessionReducer(written, { type: 'verified' });
    expect(verified.targets[0].status).toBe('written');
    expect(verified.activeIndex).toBe(1);
  });
});

describe('arete ya usado', () => {
  it('se detiene y muestra a qué animal pertenece', () => {
    const state = nfcSessionReducer(started(), {
      type: 'tag-detected',
      uid: '04A2241AB35C80',
      holder: { id: 99, record: 'BOV-777' },
    });
    expect(state.phase).toBe('conflict');
    expect(state.conflict).toEqual({
      uid: '04A2241AB35C80',
      holderId: 99,
      holderRecord: 'BOV-777',
    });
  });

  it('no bloquea cuando el arete ya pertenece al animal que se está marcando', () => {
    const state = nfcSessionReducer(started(), {
      type: 'tag-detected',
      uid: '04A2241AB35C80',
      holder: { id: 1, record: 'BOV-010' },
    });
    expect(state.phase).toBe('writing');
  });

  it('resolver el conflicto devuelve la espera sin tocar al animal', () => {
    const conflicted = nfcSessionReducer(started(), {
      type: 'tag-detected',
      uid: '04A2241AB35C80',
      holder: { id: 99, record: 'BOV-777' },
    });
    const resolved = nfcSessionReducer(conflicted, { type: 'conflict-resolved' });
    expect(resolved.phase).toBe('waiting');
    expect(resolved.targets[0].status).toBe('active');
    expect(resolved.conflict).toBeNull();
  });
});

describe('fallos', () => {
  it('deja el animal en la fila para reintentarlo con otro arete', () => {
    const failed = nfcSessionReducer(started(), {
      type: 'write-failed',
      error: 'El arete se retiró antes de terminar',
    });
    expect(failed.targets[0].status).toBe('failed');
    expect(failed.activeIndex).toBe(0);
    expect(failed.phase).toBe('waiting');
    expect(failed.instruction).toContain('otra vez');
  });

  it('saltar un animal que falló conserva la marca de fallo', () => {
    const failed = nfcSessionReducer(started(), { type: 'write-failed', error: 'x' });
    const advanced = nfcSessionReducer(failed, { type: 'skip' });
    expect(advanced.targets[0].status).toBe('failed');
    expect(advanced.activeIndex).toBe(1);
  });

  it('un fallo no detiene la manga: el siguiente animal queda listo', () => {
    const failed = nfcSessionReducer(started(), { type: 'write-failed', error: 'x' });
    const finished = writeCurrent(nfcSessionReducer(failed, { type: 'skip' }));
    expect(finished.phase).toBe('finished');
    expect(finished.targets[1].status).toBe('written');
  });

  it('reintentar devuelve a la fila todos los que fallaron', () => {
    const failed = nfcSessionReducer(started(), { type: 'write-failed', error: 'x' });
    const finished = writeCurrent(nfcSessionReducer(failed, { type: 'skip' }));
    expect(finished.phase).toBe('finished');

    const retried = nfcSessionReducer(finished, { type: 'retry-failed' });
    expect(retried.targets[0].status).toBe('active');
    expect(retried.activeIndex).toBe(0);
    expect(retried.phase).toBe('waiting');
  });
});
