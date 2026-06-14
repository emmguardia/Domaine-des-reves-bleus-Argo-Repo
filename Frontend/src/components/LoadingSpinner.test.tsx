import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';

describe('<LoadingSpinner>', () => {
  it('affiche le texte quand il est fourni', () => {
    render(<LoadingSpinner text="Chargement..." />);
    expect(screen.getByText('Chargement...')).toBeInTheDocument();
  });

  it('rend bien un spinner animé sans texte par défaut', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });
});
