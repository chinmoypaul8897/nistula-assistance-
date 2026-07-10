/**
 * Minimal Meta Cloud API webhook/send shapes (plan.md CH-02 step 4) — ONLY
 * the fields we read; §5.3 forbids inventing anything beyond it. Every field
 * is optional because §5.3 mandates tolerant parsing: unknown or partial
 * shapes are stored raw and logged, never a 500. Authored from the v23
 * documented shapes; re-verified against real captures during the CH-02
 * live demo (observed field names recorded in progress.md).
 */

export interface WaWebhookBody {
  object?: string;
  entry?: WaEntry[];
}

export interface WaEntry {
  id?: string;
  changes?: WaChange[];
}

export interface WaChange {
  field?: string;
  value?: WaValue;
}

export interface WaValue {
  messaging_product?: string;
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: WaContact[];
  messages?: WaInboundMessage[];
  statuses?: WaStatus[];
}

export interface WaContact {
  wa_id?: string;
  profile?: { name?: string };
}

export interface WaInboundMessage {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: WaMedia;
  audio?: WaMedia;
  video?: WaMedia;
  document?: WaMedia;
  location?: { latitude?: number; longitude?: number; name?: string; address?: string };
}

export interface WaMedia {
  id?: string;
  caption?: string;
}

export interface WaStatus {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: WaStatusError[];
}

export interface WaStatusError {
  code?: number;
  title?: string;
  message?: string;
  error_data?: { details?: string };
}

/** Graph API POST /messages response — the id we store, or the error we surface. */
export interface WaSendResponse {
  messages?: { id?: string }[];
  error?: { message?: string; type?: string; code?: number };
}
