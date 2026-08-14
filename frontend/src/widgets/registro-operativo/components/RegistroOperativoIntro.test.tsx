import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RegistroOperativoIntro } from './RegistroOperativoIntro';

describe('RegistroOperativoIntro', () => {
  it('explains the practical value of recording the farm day in plain language', () => {
    render(<RegistroOperativoIntro />);

    expect(screen.getByRole('heading', { name: '¿Para qué sirve este registro?' })).toBeInTheDocument();
    expect(screen.getByText(/recordar labores y tratamientos/i)).toBeInTheDocument();
    expect(screen.getByText(/saber cuánto produce y cuánto gasta/i)).toBeInTheDocument();
    expect(screen.getByText(/mostrar un historial claro/i)).toBeInTheDocument();
  });
});
