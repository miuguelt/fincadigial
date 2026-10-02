import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UNASSIGNED_COLUMN, useBoardDragDrop } from './useBoardDragDrop';

const makePointerEvent = (overrides: Record<string, unknown> = {}) => {
  const currentTarget = { setPointerCapture: vi.fn() };
  const target = { closest: vi.fn(() => null) };
  return {
    button: 0,
    pointerId: 1,
    clientX: 10,
    clientY: 10,
    target,
    currentTarget,
    preventDefault: vi.fn(),
    ...overrides,
  } as any;
};

describe('useBoardDragDrop', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('inicia el arrastre desde el botón de información de la ficha y mueve al potrero bajo el mouse', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const onDrop = vi.fn();
    const destination = document.createElement('section');
    destination.dataset.dropColumn = '24';
    vi.stubGlobal('document', Object.assign(document, { elementFromPoint: vi.fn(() => destination) }));
    const { result } = renderHook(() => useBoardDragDrop({ enabled: true, onDrop }));

    act(() => {});
    const button = Object.assign(document.createElement('button'), { setPointerCapture: vi.fn() });
    const down = makePointerEvent({
      target: Object.assign(button, {
        closest: vi.fn((selector: string) => (selector.includes('button') ? button : null)),
      }),
    });
    act(() => result.current.onPointerDown(down, 12));
    expect(button.setPointerCapture).toHaveBeenCalledWith(1);

    act(() => result.current.onPointerMove(makePointerEvent({ clientX: 30 })));
    expect(result.current.draggingId).toBe(12);
    expect(result.current.dropTarget).toBe(24);

    act(() => result.current.onPointerUp(makePointerEvent()));
    expect(onDrop).toHaveBeenCalledWith(12, 24);
    expect(result.current.draggingId).toBeNull();
    expect(result.current.dropTarget).toBeNull();
  });

  it('suelta en “Sin potrero asignado” cuando el mouse queda sobre esa columna', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const onDrop = vi.fn();
    const destination = document.createElement('section');
    destination.dataset.dropColumn = UNASSIGNED_COLUMN;
    vi.stubGlobal('document', Object.assign(document, { elementFromPoint: vi.fn(() => destination) }));
    const { result } = renderHook(() => useBoardDragDrop({ enabled: true, onDrop }));
    const event = makePointerEvent();

    act(() => result.current.onPointerDown(event, 5));
    act(() => result.current.onPointerMove(makePointerEvent({ clientX: 30 })));
    act(() => result.current.onPointerUp(makePointerEvent()));

    expect(onDrop).toHaveBeenCalledWith(5, UNASSIGNED_COLUMN);
  });

  it('no inicia el arrastre desde los controles de selección', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const { result } = renderHook(() => useBoardDragDrop({ enabled: true, onDrop: vi.fn() }));
    const event = makePointerEvent({ target: { closest: vi.fn(() => document.createElement('input')) } });

    act(() => result.current.onPointerDown(event, 5));

    expect(event.currentTarget.setPointerCapture).not.toHaveBeenCalled();
  });

  it('cancela el gesto sin mover el animal, aunque ya hubiera un destino bajo el mouse', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const onDrop = vi.fn();
    const destination = document.createElement('section');
    destination.dataset.dropColumn = '24';
    vi.stubGlobal('document', Object.assign(document, { elementFromPoint: vi.fn(() => destination) }));
    const { result } = renderHook(() => useBoardDragDrop({ enabled: true, onDrop }));

    act(() => result.current.onPointerDown(makePointerEvent(), 5));
    act(() => result.current.onPointerMove(makePointerEvent({ clientX: 30 })));
    act(() => result.current.onPointerCancel(makePointerEvent()));

    expect(onDrop).not.toHaveBeenCalled();
    expect(result.current.draggingId).toBeNull();
    expect(result.current.dropTarget).toBeNull();
    expect(result.current.consumeClickAfterDrag()).toBe(true);
  });

  it('no mueve el animal si el gesto termina antes de superar el umbral de arrastre', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const onDrop = vi.fn();
    const { result } = renderHook(() => useBoardDragDrop({ enabled: true, onDrop }));

    act(() => result.current.onPointerDown(makePointerEvent(), 5));
    act(() => result.current.onPointerMove(makePointerEvent({ clientX: 16 })));
    act(() => result.current.onPointerUp(makePointerEvent()));

    expect(onDrop).not.toHaveBeenCalled();
    expect(result.current.consumeClickAfterDrag()).toBe(false);
  });
});
