import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OfferForm } from './OfferForm';
import { marketApi } from './api';
import { ApiFetchError } from '@/shared/api/error-parser';

vi.mock('./api', () => ({ marketApi: { create: vi.fn(), update: vi.fn() } }));
vi.mock('@/app/providers/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('@/shared/ui/common/GenericModal', () => ({ GenericModal: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

describe('formulario de mercado', () => {
  beforeEach(() => vi.clearAllMocks());
  it('pide el producto a cambio y mantiene la privacidad sin selección automática', async () => {
    const user = userEvent.setup();
    render(<OfferForm onClose={vi.fn()} onSaved={vi.fn()} />);
    await user.click(screen.getByRole('radio', { name: /Cambiar/ }));
    expect(screen.getByLabelText(/Qué quieres recibir a cambio/)).toBeRequired();
    expect(screen.queryByLabelText(/Precio por unidad/)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Producto *'), 'Yuca');
    await user.type(screen.getByLabelText('Cantidad *'), '20');
    await user.type(screen.getByLabelText(/Qué quieres recibir a cambio/), 'Huevos');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByLabelText(/Compartir mi celular/)).not.toBeChecked();
    expect(screen.getByLabelText(/Acepto mostrar/)).not.toBeChecked();
    expect(marketApi.create).not.toHaveBeenCalled();
  });

  it('conserva el contenido tras un fallo y reutiliza la clave al reintentar', async () => {
    const user = userEvent.setup();
    const saved = vi.fn();
    vi.mocked(marketApi.create).mockRejectedValueOnce(new ApiFetchError('Sin conexión')).mockResolvedValueOnce({ id: 'confirmed' } as never);
    render(<OfferForm onClose={vi.fn()} onSaved={saved} />);
    await user.type(screen.getByLabelText('Producto *'), 'Café');
    await user.type(screen.getByLabelText('Cantidad *'), '10');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.type(screen.getByLabelText(/Municipio y vereda/), 'Vélez');
    await user.click(screen.getByLabelText(/Acepto mostrar/));
    await user.click(screen.getByRole('button', { name: 'Publicar', exact: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
    expect(screen.getByLabelText(/Municipio y vereda/)).toHaveValue('Vélez');
    expect(saved).not.toHaveBeenCalled();
    const firstKey = vi.mocked(marketApi.create).mock.calls[0][1];
    await user.click(screen.getByRole('button', { name: 'Publicar', exact: true }));
    expect(vi.mocked(marketApi.create).mock.calls[1][1]).toBe(firstKey);
    expect(saved).toHaveBeenCalledOnce();
  });
});
