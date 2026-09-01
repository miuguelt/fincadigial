import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GenericModal } from './GenericModal';

describe('GenericModal Keyboard Navigation', () => {
  it('navega al registro anterior y siguiente con las teclas de flecha (ArrowLeft y ArrowRight)', () => {
    const onNavigatePrevious = vi.fn();
    const onNavigateNext = vi.fn();

    render(
      <GenericModal
        isOpen={true}
        onOpenChange={vi.fn()}
        title="Expediente del Animal #101"
        enableNavigation={true}
        hasPrevious={true}
        hasNext={true}
        onNavigatePrevious={onNavigatePrevious}
        onNavigateNext={onNavigateNext}
      >
        <div>Contenido del animal</div>
      </GenericModal>
    );

    expect(screen.getByText('Expediente del Animal #101')).toBeInTheDocument();

    // Simular flecha izquierda
    fireEvent.keyDown(document, { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 });
    expect(onNavigatePrevious).toHaveBeenCalledTimes(1);

    // Simular flecha derecha
    fireEvent.keyDown(document, { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 });
    expect(onNavigateNext).toHaveBeenCalledTimes(1);
  });

  it('permite navegación con Alt + Flecha incluso dentro de campos de formulario', () => {
    const onNavigatePrevious = vi.fn();
    const onNavigateNext = vi.fn();

    render(
      <GenericModal
        isOpen={true}
        onOpenChange={vi.fn()}
        title="Formulario de Control"
        enableNavigation={true}
        hasPrevious={true}
        hasNext={true}
        onNavigatePrevious={onNavigatePrevious}
        onNavigateNext={onNavigateNext}
      >
        <input data-testid="test-input" defaultValue="Texto de prueba" />
      </GenericModal>
    );

    const input = screen.getByTestId('test-input');
    input.focus();

    // Flecha izquierda simple dentro de input NO debe disparar navegación (para permitir mover el cursor de texto)
    fireEvent.keyDown(document, { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 });
    expect(onNavigatePrevious).not.toHaveBeenCalled();

    // Alt + Flecha izquierda dentro de input SÍ debe disparar navegación
    fireEvent.keyDown(document, { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37, altKey: true });
    expect(onNavigatePrevious).toHaveBeenCalledTimes(1);

    // Alt + Flecha derecha dentro de input SÍ debe disparar navegación
    fireEvent.keyDown(document, { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, altKey: true });
    expect(onNavigateNext).toHaveBeenCalledTimes(1);
  });
});
