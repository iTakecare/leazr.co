
ALTER TABLE ticket_replies ADD COLUMN IF NOT EXISTS is_read_by_admin boolean DEFAULT false;
ALTER TABLE ticket_replies ADD COLUMN IF NOT EXISTS is_read_by_client boolean DEFAULT false;

-- Auto-mark: admin replies are read by admin, client replies are read by client
UPDATE ticket_replies SET is_read_by_admin = true WHERE sender_type = 'admin';
UPDATE ticket_replies SET is_read_by_client = true WHERE sender_type = 'client';
