import { useMemo } from "react";
import { Offer } from "@/hooks/offers/useFetchOffers";

export interface ReminderStatus {
  type: 'document_reminder' | 'offer_reminder';
  level: number; // 1, 2, 3, 5, 9
  daysElapsed: number;
  isActive: boolean;
  color: 'yellow' | 'orange' | 'red' | 'blink-red';
  label: string;
}

interface OfferReminder {
  id: string;
  offer_id: string;
  reminder_type: string;
  reminder_level: number;
  sent_at: string | null;
  created_at: string;
}

// Statuses that trigger offer reminders
const OFFER_REMINDER_STATUSES = ['sent', 'offer_send', 'accepted', 'info_requested'];

// Calculate days since a date
const daysSince = (dateStr: string | null | undefined): number => {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// Determine offer reminder level based on days elapsed
const getOfferReminderLevel = (daysElapsed: number): number | null => {
  if (daysElapsed >= 9) return 9;
  if (daysElapsed >= 5) return 5;
  if (daysElapsed >= 3) return 3;
  if (daysElapsed >= 1) return 1;
  return null;
};

// Get color based on reminder level
const getReminderColor = (level: number): 'yellow' | 'orange' | 'red' | 'blink-red' => {
  switch (level) {
    case 1: return 'yellow';
    case 2: return 'red'; // Document reminder
    case 3: return 'orange';
    case 5: return 'red';
    case 9: return 'blink-red';
    default: return 'yellow';
  }
};

// Get label based on reminder type and level
const getReminderLabel = (type: 'document_reminder' | 'offer_reminder', level: number): string => {
  if (type === 'document_reminder') {
    return 'Docs J+2';
  }
  return `J+${level}`;
};

export const useOfferReminders = (
  offer: Offer,
  sentReminders?: OfferReminder[]
): ReminderStatus | null => {
  return useMemo(() => {
    // Check for document reminder first (info_requested status with pending upload links)
    if (offer.workflow_status === 'info_requested') {
      // Use created_at as reference date
      const daysElapsed = daysSince(offer.created_at);
      
      if (daysElapsed >= 2) {
        // Check if document reminder was already sent
        const alreadySent = sentReminders?.some(
          r => r.reminder_type === 'document_reminder' && r.reminder_level === 2 && r.sent_at
        );
        
        return {
          type: 'document_reminder',
          level: 2,
          daysElapsed,
          isActive: !alreadySent,
          color: 'red',
          label: 'Docs J+2',
        };
      }
    }

    // Check for offer reminder (applicable statuses)
    if (OFFER_REMINDER_STATUSES.includes(offer.workflow_status || '')) {
      // Use created_at as reference date
      const referenceDate = offer.created_at;
      const daysElapsed = daysSince(referenceDate);
      const reminderLevel = getOfferReminderLevel(daysElapsed);

      if (reminderLevel) {
        // Check if this specific reminder level was already sent
        const alreadySent = sentReminders?.some(
          r => r.reminder_type === 'offer_reminder' && r.reminder_level === reminderLevel && r.sent_at
        );

        return {
          type: 'offer_reminder',
          level: reminderLevel,
          daysElapsed,
          isActive: !alreadySent,
          color: getReminderColor(reminderLevel),
          label: getReminderLabel('offer_reminder', reminderLevel),
        };
      }
    }

    return null;
  }, [offer, sentReminders]);
};

// Hook to calculate all reminders for a list of offers
export const useOffersReminders = (
  offers: Offer[],
  allReminders?: OfferReminder[]
): Map<string, ReminderStatus | null> => {
  return useMemo(() => {
    const remindersMap = new Map<string, ReminderStatus | null>();
    
    offers.forEach(offer => {
      const offerReminders = allReminders?.filter(r => r.offer_id === offer.id);
      
      // Inline reminder calculation
      let reminder: ReminderStatus | null = null;
      
      // Check for document reminder
      if (offer.workflow_status === 'info_requested') {
        const daysElapsed = daysSince(offer.created_at);
        if (daysElapsed >= 2) {
          const alreadySent = offerReminders?.some(
            r => r.reminder_type === 'document_reminder' && r.reminder_level === 2 && r.sent_at
          );
          reminder = {
            type: 'document_reminder',
            level: 2,
            daysElapsed,
            isActive: !alreadySent,
            color: 'red',
            label: 'Docs J+2',
          };
        }
      }
      
      // Check for offer reminder if no document reminder
      if (!reminder && OFFER_REMINDER_STATUSES.includes(offer.workflow_status || '')) {
        const referenceDate = offer.created_at;
        const daysElapsed = daysSince(referenceDate);
        const reminderLevel = getOfferReminderLevel(daysElapsed);
        
        if (reminderLevel) {
          const alreadySent = offerReminders?.some(
            r => r.reminder_type === 'offer_reminder' && r.reminder_level === reminderLevel && r.sent_at
          );
          reminder = {
            type: 'offer_reminder',
            level: reminderLevel,
            daysElapsed,
            isActive: !alreadySent,
            color: getReminderColor(reminderLevel),
            label: getReminderLabel('offer_reminder', reminderLevel),
          };
        }
      }
      
      remindersMap.set(offer.id, reminder);
    });
    
    return remindersMap;
  }, [offers, allReminders]);
};
