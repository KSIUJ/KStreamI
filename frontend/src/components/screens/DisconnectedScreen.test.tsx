import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisconnectedScreen } from './DisconnectedScreen';

describe('DisconnectedScreen - Testy Ekranu Logowania', () => {

  it('przycisk "Połącz" jest zablokowany, gdy PIN jest pusty', () => {
    const mockSetPin = vi.fn();
    const mockOnConnect = vi.fn();
    render(
      <DisconnectedScreen 
        pin="" 
        setPin={mockSetPin} 
        onConnect={mockOnConnect} 
      />
    );

    const button = screen.getByRole('button', { name: /połącz/i });
    expect(button).toBeDisabled();
  });

  it('odblokowuje przycisk "Połącz", gdy podano pełny 4-cyfrowy kod', () => {
    render(
      <DisconnectedScreen 
        pin="1234" 
        setPin={vi.fn()} 
        onConnect={vi.fn()} 
      />
    );

    const button = screen.getByRole('button', { name: /połącz/i });
    expect(button).not.toBeDisabled(); 
  });

  it('wywołuje funkcję setPin ignorując litery (tylko cyfry)', async () => {
    const user = userEvent.setup(); 
    const mockSetPin = vi.fn(); 

    render(
      <DisconnectedScreen 
        pin="" 
        setPin={mockSetPin} 
        onConnect={vi.fn()} 
      />
    );

    const input = screen.getByPlaceholderText('0000');
    
    await user.click(input);
    await user.paste('1a2');

    expect(mockSetPin).toHaveBeenLastCalledWith('12');
  });

  it('wywołuje onConnect po kliknięciu "Połącz", gdy kod jest gotowy', async () => {
    const user = userEvent.setup();
    const mockOnConnect = vi.fn(); 
    render(
      <DisconnectedScreen 
        pin="9999"
        setPin={vi.fn()} 
        onConnect={mockOnConnect}
      />
    );

    const button = screen.getByRole('button', { name: /połącz/i });
    await user.click(button); 
    expect(mockOnConnect).toHaveBeenCalledTimes(1);
  });

  it('wyświetla komunikat o błędzie, jeśli zostanie przekazany errorMessage', () => {
    const errorMessage = "Niepoprawny kod. Spróbuj ponownie.";
    
    render(
      <DisconnectedScreen 
        pin="1234" 
        setPin={vi.fn()} 
        onConnect={vi.fn()} 
        errorMessage={errorMessage} // Przekazujemy błąd
      />
    );

    const errorElement = screen.getByText(errorMessage);

    expect(errorElement).toBeInTheDocument();
  });

});