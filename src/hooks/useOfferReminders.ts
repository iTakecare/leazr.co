import { useMemo } from "react";
import { Offer } from "@/hooks/offers/useFetchOffers";

export interface ReminderStatus {
  type: 'document_reminder' | 'offer_reminder';
  level: number; // 1, 2, 3 for docs, 1, 3, 5, 9 for offers
  daysElapsed: number;
  isActive: boolean;
  color: 'yellow' | 'orange' | 'red' | 'blink-red';
  label: string;
}

export interface AllReminders {
  documentReminder: ReminderStatus | null;
  offerReminder: ReminderStatus | null;
  suggestedReminder: ReminderStatus | null;
  allLevels: ReminderStatus[];
}

interface OfferReminder {
  id: string;
  offer_id: string;
  reminder_type: string;
  reminder_level: number;
  sent_at: string | null;
  created_at: string;
}

// Statuses that trigger document reminders
export const DOCUMENT_REMINDER_STATUSES = ['info_requested', 'internal_docs_requested'];

// Statuses that trigger offer reminders (excluding document statuses to avoid duplicates)
export const OFFER_REMINDER_STATUSES = ['sent', 'offer_send', 'accepted'];

// All available offer reminder levels
const OFFER_REMINDER_LEVELS = [1, 3, 5, 9];

// All available document reminder levels (3 niveaux)
const DOCUMENT_REMINDER_LEVELS = [1, 2, 3];

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

// Determine document reminder level based on days elapsed
const getDocumentReminderLevel = (daysElapsed: number): number | null => {
  if (daysElapsed >= 9) return 3; // L3 - Urgent
  if (daysElapsed >= 5) return 2; // L2 - Relance
  if (daysElapsed >= 2) return 1; // L1 - Premier rappel
  return null;
};

// Get color based on reminder level and type
const getReminderColor = (level: number, type: 'document_reminder' | 'offer_reminder'): 'yellow' | 'orange' | 'red' | 'blink-red' => {
  if (type === 'document_reminder') {
    switch (level) {
      case 1: return 'yellow';
      case 2: return 'orange';
      case 3: return 'blink-red';
      default: return 'yellow';
    }
  }
  switch (level) {
    case 1: return 'yellow';
    case 3: return 'orange';
    case 5: return 'red';
    case 9: return 'blink-red';
    default: return 'yellow';
  }
};

// Get label based on reminder type and level
const getReminderLabel = (type: 'document_reminder' | 'offer_reminder', level: number): string => {
  if (type === 'document_reminder') {
    return `Docs L${level}`;
  }
  return `J+${level}`;
};

// Hook to get ALL reminders for a single offer (both doc + offer reminders, all levels)
export const useOfferAllReminders = (
  offer: Offer,
  sentReminders?: OfferReminder[]
): AllReminders => {
  return useMemo(() => {
    const result: AllReminders = {
      documentReminder: null,
      offerReminder: null,
      suggestedReminder: null,
      allLevels: [],
    };

    const daysElapsed = daysSince(offer.created_at);

    // Check for document reminder (info_requested or internal_docs_requested status)
    if (DOCUMENT_REMINDER_STATUSES.includes(offer.workflow_status || '')) {
      const suggestedDocLevel = getDocumentReminderLevel(daysElapsed);
      
      if (suggestedDocLevel) {
        const alreadySent = sentReminders?.some(
          r => r.reminder_type === 'document_reminder' && r.reminder_level === suggestedDocLevel && r.sent_at
        );
        
        result.documentReminder = {
          type: 'document_reminder',
          level: suggestedDocLevel,
          daysElapsed,
          isActive: !alreadySent,
          color: getReminderColor(suggestedDocLevel, 'document_reminder'),
          label: getReminderLabel('document_reminder', suggestedDocLevel),
        };
      }

      // Build all document levels for selection
      result.allLevels = DOCUMENT_REMINDER_LEVELS.map(level => {
        const alreadySent = sentReminders?.some(
          r => r.reminder_type === 'document_reminder' && r.reminder_level === level && r.sent_at
        );
        return {
          type: 'document_reminder' as const,
          level,
          daysElapsed,
          isActive: !alreadySent,
          color: getReminderColor(level, 'document_reminder'),
          label: getReminderLabel('document_reminder', level),
        };
      });
    }

    // Check for offer reminder (applicable statuses)
    if (OFFER_REMINDER_STATUSES.includes(offer.workflow_status || '')) {
      const suggestedLevel = getOfferReminderLevel(daysElapsed);
      
      if (suggestedLevel) {
        const alreadySent = sentReminders?.some(
          r => r.reminder_type === 'offer_reminder' && r.reminder_level === suggestedLevel && r.sent_at
        );

        result.offerReminder = {
          type: 'offer_reminder',
          level: suggestedLevel,
          daysElapsed,
          isActive: !alreadySent,
          color: getReminderColor(suggestedLevel, 'offer_reminder'),
          label: getReminderLabel('offer_reminder', suggestedLevel),
        };
      }

      // Build all available levels for selection
      result.allLevels = OFFER_REMINDER_LEVELS.map(level => {
        const alreadySent = sentReminders?.some(
          r => r.reminder_type === 'offer_reminder' && r.reminder_level === level && r.sent_at
        );
        return {
          type: 'offer_reminder' as const,
          level,
          daysElapsed,
          isActive: !alreadySent,
          color: getReminderColor(level, 'offer_reminder'),
          label: getReminderLabel('offer_reminder', level),
        };
      });
    }

    // Determine suggested reminder (document takes priority)
    result.suggestedReminder = result.documentReminder || result.offerReminder;

    return result;
  }, [offer, sentReminders]);
};

// Original hook for backward compatibility (returns single reminder)
export const useOfferReminders = (
  offer: Offer,
  sentReminders?: OfferReminder[]
): ReminderStatus | null => {
  return useMemo(() => {
    const daysElapsed = daysSince(offer.created_at);

    // Check for document reminder first (info_requested or internal_docs_requested status)
    if (DOCUMENT_REMINDER_STATUSES.includes(offer.workflow_status || '')) {
      const docLevel = getDocumentReminderLevel(daysElapsed);
      
      if (docLevel) {
        const alreadySent = sentReminders?.some(
          r => r.reminder_type === 'document_reminder' && r.reminder_level === docLevel && r.sent_at
        );
        
        return {
          type: 'document_reminder',
          level: docLevel,
          daysElapsed,
          isActive: !alreadySent,
          color: getReminderColor(docLevel, 'document_reminder'),
          label: getReminderLabel('document_reminder', docLevel),
        };
      }
    }

    // Check for offer reminder (applicable statuses)
    if (OFFER_REMINDER_STATUSES.includes(offer.workflow_status || '')) {
      const reminderLevel = getOfferReminderLevel(daysElapsed);

      if (reminderLevel) {
        const alreadySent = sentReminders?.some(
          r => r.reminder_type === 'offer_reminder' && r.reminder_level === reminderLevel && r.sent_at
        );

        return {
          type: 'offer_reminder',
          level: reminderLevel,
          daysElapsed,
          isActive: !alreadySent,
          color: getReminderColor(reminderLevel, 'offer_reminder'),
          label: getReminderLabel('offer_reminder', reminderLevel),
        };
      }
    }

    return null;
  }, [offer, sentReminders]);
};

// Hook to calculate all reminders (both types) for a list of offers
export const useOffersReminders = (
  offers: Offer[],
  allReminders?: OfferReminder[]
): Map<string, AllReminders> => {
  return useMemo(() => {
    const remindersMap = new Map<string, AllReminders>();
    
    offers.forEach(offer => {
      const offerReminders = allReminders?.filter(r => r.offer_id === offer.id);
      const daysElapsed = daysSince(offer.created_at);
      
      const result: AllReminders = {
        documentReminder: null,
        offerReminder: null,
        suggestedReminder: null,
        allLevels: [],
      };

      // Check for document reminder
      if (DOCUMENT_REMINDER_STATUSES.includes(offer.workflow_status || '')) {
        const suggestedDocLevel = getDocumentReminderLevel(daysElapsed);
        
        if (suggestedDocLevel) {
          const alreadySent = offerReminders?.some(
            r => r.reminder_type === 'document_reminder' && r.reminder_level === suggestedDocLevel && r.sent_at
          );
          result.documentReminder = {
            type: 'document_reminder',
            level: suggestedDocLevel,
            daysElapsed,
            isActive: !alreadySent,
            color: getReminderColor(suggestedDocLevel, 'document_reminder'),
            label: getReminderLabel('document_reminder', suggestedDocLevel),
          };
        }

        // Build all document levels
        result.allLevels = DOCUMENT_REMINDER_LEVELS.map(level => {
          const alreadySent = offerReminders?.some(
            r => r.reminder_type === 'document_reminder' && r.reminder_level === level && r.sent_at
          );
          return {
            type: 'document_reminder' as const,
            level,
            daysElapsed,
            isActive: !alreadySent,
            color: getReminderColor(level, 'document_reminder'),
            label: getReminderLabel('document_reminder', level),
          };
        });
      }
      
      // Check for offer reminder
      if (OFFER_REMINDER_STATUSES.includes(offer.workflow_status || '')) {
        const suggestedLevel = getOfferReminderLevel(daysElapsed);
        
        if (suggestedLevel) {
          const alreadySent = offerReminders?.some(
            r => r.reminder_type === 'offer_reminder' && r.reminder_level === suggestedLevel && r.sent_at
          );
          result.offerReminder = {
            type: 'offer_reminder',
            level: suggestedLevel,
            daysElapsed,
            isActive: !alreadySent,
            color: getReminderColor(suggestedLevel, 'offer_reminder'),
            label: getReminderLabel('offer_reminder', suggestedLevel),
          };
        }

        // Build all offer levels
        result.allLevels = OFFER_REMINDER_LEVELS.map(level => {
          const alreadySent = offerReminders?.some(
            r => r.reminder_type === 'offer_reminder' && r.reminder_level === level && r.sent_at
          );
          return {
            type: 'offer_reminder' as const,
            level,
            daysElapsed,
            isActive: !alreadySent,
            color: getReminderColor(level, 'offer_reminder'),
            label: getReminderLabel('offer_reminder', level),
          };
        });
      }

      // Suggested is document if available, otherwise offer
      result.suggestedReminder = result.documentReminder || result.offerReminder;
      
      remindersMap.set(offer.id, result);
    });
    
    return remindersMap;
  }, [offers, allReminders]);
};
