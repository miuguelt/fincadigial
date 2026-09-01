import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  ModalStackContext,
} from './dialog';
import { isDialogClosingRecently } from '@/shared/utils/modalGuard';

describe('Dialog y ModalStackContext', () => {
  beforeEach(() => {
    (window as any).__vl_last_dialog_close_time__ = 0;
    vi.restoreAllMocks();
  });

  it('renderiza un diálogo base con zIndex y depth correctos (Nivel 0)', () => {
    let capturedDepth = -1;
    const DepthProbe = () => {
      const { depth } = React.useContext(ModalStackContext);
      capturedDepth = depth;
      return null;
    };

    render(
      <Dialog open={true}>
        <DialogContent data-testid="dialog-content-1">
          <DepthProbe />
          <DialogHeader>
            <DialogTitle>Diálogo Nivel 1</DialogTitle>
            <DialogDescription>Descripción nivel 1</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByText('Diálogo Nivel 1')).toBeInTheDocument();
    expect(capturedDepth).toBe(1);

    const content = screen.getByTestId('dialog-content-1');
    expect(content.style.zIndex).toBe('1200');
  });

  it('calcula zIndex acumulativo cuando hay modales apilados (Pila de Modales)', () => {
    let nestedDepth = -1;
    const NestedProbe = () => {
      const { depth } = React.useContext(ModalStackContext);
      nestedDepth = depth;
      return null;
    };

    render(
      <Dialog open={true}>
        <DialogContent data-testid="parent-modal">
          <DialogHeader>
            <DialogTitle>Modal Padre</DialogTitle>
            <DialogDescription>Descripción Padre</DialogDescription>
          </DialogHeader>

          {/* Modal Hijo Anidado en la Pila */}
          <Dialog open={true}>
            <DialogContent data-testid="child-modal">
              <NestedProbe />
              <DialogHeader>
                <DialogTitle>Modal Hijo</DialogTitle>
                <DialogDescription>Descripción Hijo</DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>
    );

    expect(nestedDepth).toBe(2);
    const parentContent = screen.getByTestId('parent-modal');
    const childContent = screen.getByTestId('child-modal');

    expect(parentContent.style.zIndex).toBe('1200');
    expect(childContent.style.zIndex).toBe('1300');
  });

  it('dispara markDialogClosing al pulsar el botón de cerrar', () => {
    const onOpenChange = vi.fn();

    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Diálogo de Prueba</DialogTitle>
            <DialogDescription>Descripción</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    const closeBtn = screen.getByLabelText('Cerrar diálogo');
    expect(closeBtn).toBeInTheDocument();

    expect(isDialogClosingRecently()).toBe(false);
    fireEvent.click(closeBtn);

    expect(isDialogClosingRecently()).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('cierra el diálogo al presionar la tecla Escape', () => {
    const onOpenChange = vi.fn();

    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Diálogo de Prueba</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape', keyCode: 27 });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('cierra únicamente el modal superior cuando hay modales apilados al presionar Escape', () => {
    const onParentClose = vi.fn();
    const onChildClose = vi.fn();

    render(
      <Dialog open={true} onOpenChange={onParentClose}>
        <DialogContent data-testid="parent-modal">
          <DialogHeader>
            <DialogTitle>Modal Padre</DialogTitle>
          </DialogHeader>
          <Dialog open={true} onOpenChange={onChildClose}>
            <DialogContent data-testid="child-modal">
              <DialogHeader>
                <DialogTitle>Modal Hijo</DialogTitle>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>
    );

    // Al presionar Escape, debe cerrar el hijo primero (profundidad 2)
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape', keyCode: 27 });
    expect(onChildClose).toHaveBeenCalledWith(false);
    expect(onParentClose).not.toHaveBeenCalled();
  });
});
