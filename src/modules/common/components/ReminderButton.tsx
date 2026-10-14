import { useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { sendReminder } from '@/services/notification.service';

interface ReminderButtonProps {
  person: { id: string; fullName: string };
  /** Nombre de quien envía el recordatorio. */
  sentBy: string;
  variant?: 'primary' | 'secondary';
}

/** Botón "Recordar": registra un aviso de actividades pendientes y muestra si se envió. */
export function ReminderButton({ person, sentBy, variant = 'primary' }: ReminderButtonProps) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleClick = async () => {
    setState('sending');
    try {
      await sendReminder(person, sentBy);
      setState('sent');
    } catch {
      setState('error');
    }
  };

  return (
    <Button
      variant={variant}
      disabled={state === 'sending' || state === 'sent'}
      onClick={(event) => {
        // En una fila clicable, el botón no debe abrir la ficha.
        event.stopPropagation();
        void handleClick();
      }}
      title={state === 'error' ? 'No se pudo enviar. Intente de nuevo.' : undefined}
    >
      <Mail size={16} />
      {state === 'sending' ? 'Enviando…' : state === 'sent' ? 'Enviado' : state === 'error' ? 'Reintentar' : 'Recordar'}
    </Button>
  );
}
