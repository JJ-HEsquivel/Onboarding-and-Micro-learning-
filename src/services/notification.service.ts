/**
 * Avisos a las personas (jsi_notification). La app crea el registro; el envío del correo
 * lo hará un flujo de Power Automate que se dispare al crearse un aviso (fase 5).
 */
import { Jsi_notificationsService } from '@/generated/services/Jsi_notificationsService';
import type { Jsi_notificationsjsi_type } from '@/generated/models/Jsi_notificationsModel';
import { bind, unwrap } from './dataverse';

type NewNotificationRecord = Parameters<typeof Jsi_notificationsService.create>[0];

const NOTIFICATION_TYPE = {
  Reminder: 100000000,
  DocumentUpdate: 100000001,
  Assessment: 100000002,
  Campaign: 100000003,
  Welcome: 100000004,
} as const satisfies Record<string, Jsi_notificationsjsi_type>;

const NOTIFICATION_STATUS_SENT = 100000000;

export interface NewNotification {
  personId: string;
  type: keyof typeof NOTIFICATION_TYPE;
  title: string;
  details: string;
}

export async function notify(notification: NewNotification): Promise<void> {
  const record = {
    'jsi_Employee@odata.bind': bind('contacts', notification.personId),
    jsi_type: NOTIFICATION_TYPE[notification.type],
    jsi_status: NOTIFICATION_STATUS_SENT,
    jsi_title: notification.title.slice(0, 200),
    jsi_details: notification.details,
    jsi_date: new Date().toISOString(),
  } as NewNotificationRecord;
  unwrap(await Jsi_notificationsService.create(record), 'Registrar aviso');
}

/** Recordatorio manual de actividades pendientes (botón "Recordar"). */
export function sendReminder(person: { id: string; fullName: string }, sentBy: string): Promise<void> {
  return notify({
    personId: person.id,
    type: 'Reminder',
    title: 'Recordatorio de actividades pendientes',
    details: `${sentBy} le recuerda completar las lecturas y evaluaciones pendientes de su inducción.`,
  });
}
