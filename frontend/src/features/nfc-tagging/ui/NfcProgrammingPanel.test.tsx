import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NfcProgrammingPanel } from './NfcProgrammingPanel';
import { DEFAULT_NFC_SETTINGS, type NfcTagAnimal } from '../model/types';

vi.mock('../api/nfcBinding.service', () => ({
  nfcBindingService: { bind: vi.fn(), unbind: vi.fn(), lookup: vi.fn() },
  TagConflictError: class extends Error {},
}));

const animals: NfcTagAnimal[] = [
  { id: 7261, record: 'BOV-010', fincaId: 3, sex: 'Hembra', birthDate: '2023-01-02' },
  { id: 7266, record: 'BOV-015', fincaId: 3, sex: 'Macho', birthDate: '2023-03-18' },
];

const renderPanel = () =>
  render(<NfcProgrammingPanel animals={animals} settings={DEFAULT_NFC_SETTINGS} />);

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).NDEFReader;
  vi.unstubAllGlobals();
});

describe('equipo sin Web NFC', () => {
  it('explica que un iPhone no puede grabar y qué equipo sí sirve', () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      maxTouchPoints: 5,
    });
    renderPanel();

    expect(screen.getByText(/El iPhone no permite grabar chapetas NFC/i)).toBeTruthy();
    // Además del motivo, tiene que quedar claro qué hacer para poder trabajar.
    expect(screen.getByText(/Consigue un celular Android/i)).toBeTruthy();
    expect(screen.getByText(/Abre la aplicación en Chrome/i)).toBeTruthy();
    expect(screen.getByText(/Prende el NFC del celular/i)).toBeTruthy();
    // Sin soporte no debe ofrecerse una acción que no puede cumplir.
    expect(screen.queryByRole('button', { name: /iniciar marcaje/i })).toBeNull();
  });

  it('en un navegador de escritorio dice cómo salir del bloqueo', () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      maxTouchPoints: 0,
    });
    vi.stubGlobal('isSecureContext', true);
    renderPanel();

    expect(screen.getByText(/Este navegador no sirve para grabar chapetas/i)).toBeTruthy();
    expect(screen.getByText(/Abre la aplicación en Chrome/i)).toBeTruthy();
  });

  it('sobre una conexión sin cifrar señala el requisito de HTTPS', () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/120',
      maxTouchPoints: 5,
    });
    vi.stubGlobal('isSecureContext', false);
    renderPanel();

    expect(screen.getByText(/la conexión no es segura/i)).toBeTruthy();
    expect(screen.getByText(/Entra por la dirección con candado/i)).toBeTruthy();
  });
});

describe('equipo con Web NFC', () => {
  it('muestra la fila de animales y espera a que el operario arranque', () => {
    class FakeNDEFReader {
      onreading: unknown = null;
      onreadingerror: unknown = null;
      scan = vi.fn().mockResolvedValue(undefined);
      write = vi.fn().mockResolvedValue(undefined);
      makeReadOnly = vi.fn().mockResolvedValue(undefined);
    }
    vi.stubGlobal('NDEFReader', FakeNDEFReader);
    (window as unknown as Record<string, unknown>).NDEFReader = FakeNDEFReader;

    renderPanel();

    expect(screen.getByRole('button', { name: /iniciar marcaje/i })).toBeTruthy();
    expect(screen.getByText(/ten las chapetas a la mano/i)).toBeTruthy();
    // El animal en turno aparece dos veces a propósito: grande en el escenario
    // y como fila de la lista, que es la que se puede tocar para adelantarlo.
    expect(screen.getAllByText('BOV-010')).toHaveLength(2);
    expect(screen.getByText('BOV-015')).toBeTruthy();
    expect(screen.getByText(/0 de 2 grabados/i)).toBeTruthy();
  });

  it('muestra abierta la explicación de uso mientras no se ha grabado nada', () => {
    class FakeNDEFReader {
      onreading: unknown = null;
      onreadingerror: unknown = null;
      scan = vi.fn().mockResolvedValue(undefined);
      write = vi.fn().mockResolvedValue(undefined);
      makeReadOnly = vi.fn().mockResolvedValue(undefined);
    }
    vi.stubGlobal('NDEFReader', FakeNDEFReader);
    (window as unknown as Record<string, unknown>).NDEFReader = FakeNDEFReader;

    renderPanel();

    expect(screen.getByRole('button', { name: /cómo se graba una chapeta/i })).toBeTruthy();
    expect(screen.getByText(/Pega la chapeta a la espalda del celular/i)).toBeTruthy();
    expect(screen.getByText(/Sostenlo quieto hasta que vibre/i)).toBeTruthy();
    // El tropiezo más común en el corral no puede quedar escondido.
    expect(screen.getByText(/No vibra ni suena nada/i)).toBeTruthy();
  });
});
