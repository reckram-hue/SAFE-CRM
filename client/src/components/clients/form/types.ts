// ---------------------------------------------------------------------------
// Shared types used across the ClientForm and its sub-sections.
// Keep this file pure — no React imports, no side-effects.
// ---------------------------------------------------------------------------

export interface LookupItem {
  id: number;
  name: string;
  is_active: boolean;
}

export interface ServiceItem {
  id: number;
  name: string;
  base_fee: number;
  is_annual: boolean;
  is_active: boolean;
}

export interface SelectedService {
  service_id: number;
  negotiated_fee: number;
  base_fee_at_booking: number;
  discount_reason: string;
}

export interface Contact {
  contact_id?: number;
  full_name: string;
  primary_phone: string;
  secondary_phone?: string;
  email?: string;
  notes?: string;
  priority_order: number;
  relationship_type: string;
  is_keyholder?: boolean;
}

export interface AlarmModel {
  id: number;
  name: string;
}

export interface AlarmMake {
  id: number;
  name: string;
  models: AlarmModel[];
}

export interface ZoneType {
  id: number;
  label: string;
}

export interface ClientZone {
  zoneNumber: number;
  zoneTypeId: number;
  description: string;
}

export interface ClientFormProps {
  mode: 'add' | 'edit';
  initialData?: any;
  onSubmitSuccess: () => void;
  onCancel: () => void;
}
