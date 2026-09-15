import { describe, expect, it } from 'vitest';

import { getTaskCompletionIndicator } from './taskCompletion';

describe('indicador de registro de cumplimiento de tareas', () => {
  it('Given una tarea completada con registro, When se prepara la vista, Then muestra el vínculo persistente', () => {
    expect(
      getTaskCompletionIndicator({ status: 'Completada', completion_record_id: 42 }),
    ).toEqual({
      state: 'linked',
      label: 'Registro #42',
      helper: 'Cumplimiento guardado en el sistema',
    });
  });

  it('Given una tarea pendiente, When se prepara la vista, Then informa cuándo se generará el registro', () => {
    expect(
      getTaskCompletionIndicator({ status: 'Pendiente', completion_record_id: null }),
    ).toEqual({
      state: 'pending',
      label: 'Sin registro todavía',
      helper: 'Se genera al marcar la tarea como completada',
    });
  });

  it('Given una tarea completada sin vínculo, When se prepara la vista, Then alerta la inconsistencia para corregirla', () => {
    expect(
      getTaskCompletionIndicator({ status: 'Completada', completion_record_id: null }),
    ).toEqual({
      state: 'missing',
      label: 'Registro pendiente',
      helper: 'La tarea está completada, pero falta su registro ligado',
    });
  });
});
