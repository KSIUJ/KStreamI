import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StreamingScreen } from './StreamingScreen';

const mockStream = {
  getVideoTracks: vi.fn(() => [])
} as unknown as MediaStream;

describe('StreamingScreen - Testy Ekranu Nadawania', () => {

  it('wyświetla komunikat o udostępnianiu i przycisk kończący', () => {
    render(<StreamingScreen stream={mockStream} onStopCapture={vi.fn()} />);

    const stopButton = screen.getByRole('button', { name: /zatrzymaj udostępnianie/i });
    expect(stopButton).toBeInTheDocument();
  });

  it('wywołuje onStopCapture po kliknięciu czerwonego przycisku', async () => {
    const user = userEvent.setup();
    const mockOnStopCapture = vi.fn(); 
    
    render(<StreamingScreen stream={mockStream} onStopCapture={mockOnStopCapture} />);

    const stopButton = screen.getByRole('button', { name: /zatrzymaj udostępnianie/i });
    await user.click(stopButton);

    expect(mockOnStopCapture).toHaveBeenCalledTimes(1);
  });

});