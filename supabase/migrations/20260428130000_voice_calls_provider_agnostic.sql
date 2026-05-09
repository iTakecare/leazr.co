-- Provider-agnostic rename. Switching from Vapi to ElevenLabs Agents.
-- Safe: voice_calls table is empty (added in 20260428120000, no rows yet).

alter table public.voice_calls
  rename column vapi_call_id to provider_conversation_id;

alter table public.voice_calls
  rename column vapi_assistant_id to provider_agent_id;

alter table public.voice_calls
  add column if not exists provider text not null default 'elevenlabs';

alter table public.voice_calls
  add column if not exists provider_call_sid text;  -- Twilio SID, useful for debugging telephony

comment on column public.voice_calls.provider is
  'Voice AI provider that handled this call (elevenlabs, vapi, etc.).';
comment on column public.voice_calls.provider_conversation_id is
  'ElevenLabs conversation_id (or equivalent provider call ID).';
comment on column public.voice_calls.provider_call_sid is
  'Telephony-layer call SID (Twilio for ElevenLabs).';
