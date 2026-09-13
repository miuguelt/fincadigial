import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestionChips } from '@/shared/ui/SuggestionChips';

describe('SuggestionChips component', () => {
  it('renders suggestions correctly and handles clicks', () => {
    const handleSelect = vi.fn();
    const suggestions = ['Mastitis', 'Purgado', { label: '5 cc', value: 5 }];

    render(
      <SuggestionChips
        suggestions={suggestions}
        value="Mastitis"
        onSelect={handleSelect}
      />
    );

    expect(screen.getByText(/sugerencias:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mastitis' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Purgado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5 cc' })).toBeInTheDocument();

    // Verify 'Mastitis' has selected styles
    const selectedBtn = screen.getByRole('button', { name: 'Mastitis' });
    expect(selectedBtn.className).toContain('bg-primary');

    // Click 'Purgado'
    fireEvent.click(screen.getByRole('button', { name: 'Purgado' }));
    expect(handleSelect).toHaveBeenCalledWith('Purgado');

    // Click '5 cc'
    fireEvent.click(screen.getByRole('button', { name: '5 cc' }));
    expect(handleSelect).toHaveBeenCalledWith(5);
  });

  it('renders nothing when suggestions array is empty', () => {
    const { container } = render(
      <SuggestionChips suggestions={[]} onSelect={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when disabled is true', () => {
    const { container } = render(
      <SuggestionChips
        suggestions={['Opción 1']}
        disabled={true}
        onSelect={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
