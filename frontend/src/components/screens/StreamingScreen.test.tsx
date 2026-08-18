import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StreamingScreen } from './StreamingScreen';

describe('StreamingScreen - Testy Ekranu Nadawania', () => {

  it('wyświetla komunikat o udostępnianiu i przycisk kończący', () => {
    render(<StreamingScreen onStopStreaming={vi.fn()} />);

    const heading = screen.getByText('Twój ekran jest widoczny');
    expect(heading).toBeInTheDocument();

    const stopButton = screen.getByRole('button', { name: /zakończ udostępnianie/i });
    expect(stopButton).toBeInTheDocument();
  });

  it('wywołuje onStopStreaming po kliknięciu czerwonego przycisku', async () => {
    const user = userEvent.setup();
    const mockOnStopStreaming = vi.fn(); 
    render(<StreamingScreen onStopStreaming={mockOnStopStreaming} />);

    const stopButton = screen.getByRole('button', { name: /zakończ udostępnianie/i });
    await user.click(stopButton);

    expect(mockOnStopStreaming).toHaveBeenCalledTimes(1);
  });

});