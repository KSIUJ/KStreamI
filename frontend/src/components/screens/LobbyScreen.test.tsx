import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LobbyScreen } from './LobbyScreen';

describe('LobbyScreen - Testy Ekranu Poczekalni', () => {

  it('wyświetla stan "gotowy" i odblokowuje przycisk, gdy serwer jest wolny', () => {
    render(
      <LobbyScreen 
        serverBusy={false} 
        emitMockEvent={vi.fn()} 
        onStartStreaming={vi.fn()} 
        onDisconnect={vi.fn()} 
      />
    );

    expect(screen.getByText('Serwer gotowy')).toBeInTheDocument();
    
    const startButton = screen.getByRole('button', { name: /rozpocznij udostępnianie/i });
    expect(startButton).not.toBeDisabled();
  });

  it('wyświetla stan "zajęty" i blokuje przycisk, gdy serwer jest zajęty', () => {
    render(
      <LobbyScreen 
        serverBusy={true} 
        emitMockEvent={vi.fn()} 
        onStartStreaming={vi.fn()} 
        onDisconnect={vi.fn()} 
      />
    );

    expect(screen.getByText('Serwer zajęty')).toBeInTheDocument();
    
    const startButton = screen.getByRole('button', { name: /rozpocznij udostępnianie/i });
    expect(startButton).toBeDisabled();
  });

  it('wywołuje onDisconnect po kliknięciu "Rozłącz"', async () => {
    const user = userEvent.setup();
    const mockOnDisconnect = vi.fn(); // Nasz szpieg

    render(
      <LobbyScreen 
        serverBusy={false} 
        emitMockEvent={vi.fn()} 
        onStartStreaming={vi.fn()} 
        onDisconnect={mockOnDisconnect} 
      />
    );

    const disconnectButton = screen.getByRole('button', { name: /rozłącz/i });
    await user.click(disconnectButton);

    expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
  });

  it('wywołuje onStartStreaming po wciśnięciu klawisza Enter (gdy serwer jest wolny)', async () => {
    const user = userEvent.setup();
    const mockOnStart = vi.fn();

    render(
      <LobbyScreen 
        serverBusy={false} 
        emitMockEvent={vi.fn()} 
        onStartStreaming={mockOnStart} 
        onDisconnect={vi.fn()} 
      />
    );

    await user.keyboard('{Enter}');

    expect(mockOnStart).toHaveBeenCalledTimes(1);
  });

  it('ignoruje wciśnięcie klawisza Enter, gdy serwer jest zajęty', async () => {
    const user = userEvent.setup();
    const mockOnStart = vi.fn();

    render(
      <LobbyScreen 
        serverBusy={true} 
        emitMockEvent={vi.fn()} 
        onStartStreaming={mockOnStart} 
        onDisconnect={vi.fn()} 
      />
    );

    await user.keyboard('{Enter}');

    expect(mockOnStart).not.toHaveBeenCalled();
  });

});