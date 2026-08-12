import { useState, useEffect } from 'react';
import { API_BASE } from '../../../config/api';
import type {
  LookupItem,
  ServiceItem,
  SelectedService,
  Contact,
  ClientFormProps,
  AlarmMake,
  ZoneType,
  ClientZone
} from './types';

// ---------------------------------------------------------------------------
// Proration helpers (previously inlined in ClientForm)
// ---------------------------------------------------------------------------
export function getDaysRemainingUntilDec1(sinceDateStr: string): number {
  const startDate = new Date(sinceDateStr);
  startDate.setHours(0, 0, 0, 0);
  const year = startDate.getFullYear();
  const targetDate = new Date(year, 10, 30); // Nov 30
  targetDate.setHours(0, 0, 0, 0);
  if (startDate > targetDate) {
    targetDate.setFullYear(year + 1);
  }
  const diffTime = targetDate.getTime() - startDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

export function calculateProratedFee(sinceDateStr: string, annualFee: number): number {
  const days = getDaysRemainingUntilDec1(sinceDateStr);
  return parseFloat(((annualFee * days) / 365).toFixed(2));
}

// ---------------------------------------------------------------------------
// Internal helper: map transmitter type → service line-items
// ---------------------------------------------------------------------------
function getServicesForTransmitter(type: string): { service_id: number; is_annual: boolean; base_fee: number }[] {
  const list: { service_id: number; is_annual: boolean; base_fee: number }[] = [];
  if (type === 'RF_RADIO') {
    list.push({ service_id: 5, is_annual: true, base_fee: 350.0 });
  } else if (type === 'HYYP_GSM') {
    list.push({ service_id: 6, is_annual: true, base_fee: 450.0 });
    list.push({ service_id: 7, is_annual: false, base_fee: 50.0 });
  } else if (type === 'OLARM_GSM') {
    list.push({ service_id: 6, is_annual: true, base_fee: 450.0 });
    list.push({ service_id: 8, is_annual: false, base_fee: 50.0 });
  } else if (type === 'DAHUA_IP') {
    list.push({ service_id: 15, is_annual: true, base_fee: 400.0 });
  } else if (type === 'AJAX_IP') {
    list.push({ service_id: 16, is_annual: true, base_fee: 450.0 });
  }
  return list;
}

// ---------------------------------------------------------------------------
// useClientForm — the single source of truth for all ClientForm state
// ---------------------------------------------------------------------------
export function useClientForm({ mode, initialData, onSubmitSuccess }: Pick<ClientFormProps, 'mode' | 'initialData' | 'onSubmitSuccess'>) {

  // ── Lookup data ────────────────────────────────────────────────────────────
  const [towns, setTowns] = useState<LookupItem[]>([]);
  const [suburbs, setSuburbs] = useState<LookupItem[]>([]);
  const [sectors, setSectors] = useState<LookupItem[]>([]);
  const [estates, setEstates] = useState<LookupItem[]>([]);
  const [servicesList, setServicesList] = useState<ServiceItem[]>([]);
  const [alarmMakes, setAlarmMakes] = useState<AlarmMake[]>([]);
  const [zoneTypes, setZoneTypes] = useState<ZoneType[]>([]);
  const [paymentMethodsList, setPaymentMethodsList] = useState<any[]>([]);

  // ── Client Particulars ─────────────────────────────────────────────────────
  const [clientType, setClientType] = useState(initialData?.client_type || 'BUSINESS');
  const [title, setTitle] = useState(initialData?.title || 'Mr');
  const [firstName, setFirstName] = useState(initialData?.first_name || '');
  const [surname, setSurname] = useState(initialData?.surname || '');
  const [companyName, setCompanyName] = useState(initialData?.company_name || '');
  const [vatNo, setVatNo] = useState(initialData?.vat_no || '');
  const [companyRegNo, setCompanyRegNo] = useState(initialData?.company_reg_no || '');
  const [idPassportNo, setIdPassportNo] = useState(initialData?.id_passport_no || '');
  const [billingCycle, setBillingCycle] = useState(initialData?.billing_cycle || 'Monthly');
  const [clientSince, setClientSince] = useState(
    initialData?.client_since
      ? new Date(initialData.client_since).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );

  // Anniversary month defaults to clientSince month (1-12)
  const defaultAnniversaryMonth = initialData?.anniversary_month || (new Date(clientSince).getMonth() + 1);
  const [anniversaryMonth, setAnniversaryMonth] = useState<number>(defaultAnniversaryMonth);

  // Auto-calculate anniversary month when clientSince changes
  useEffect(() => {
    if (!initialData?.anniversary_month) {
      setAnniversaryMonth(new Date(clientSince).getMonth() + 1);
    }
  }, [clientSince]);

  // ── Payment ────────────────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState(initialData?.payment_method || 'EFT');
  const [bankName, setBankName] = useState(initialData?.bank_name || '');
  const [accountType, setAccountType] = useState(initialData?.account_type || 'Savings');
  const [branchCode, setBranchCode] = useState(initialData?.branch_code || '');
  const [accountNo, setAccountNo] = useState(initialData?.account_no || '');
  const [accountHolderName, setAccountHolderName] = useState(initialData?.cc_provider || '');
  const [monthlyTariff, setMonthlyTariff] = useState(initialData?.monthly_tariff?.toString() || '');
  const [hasManuallyOverriddenTariff, setHasManuallyOverriddenTariff] = useState(!!initialData);

  // ── Site Particulars ───────────────────────────────────────────────────────
  const initialSite = initialData?.sites?.[0] || {};
  const [siteName, setSiteName] = useState(initialSite.site_name || 'Primary Site');
  const [streetNumber, setStreetNumber] = useState(initialSite.street_number || '');
  const [unitNumber, setUnitNumber] = useState(initialSite.unit_number || '');
  const [streetName, setStreetName] = useState(initialSite.street_name || '');
  const [streetId, setStreetId] = useState(initialSite.street_id || '');
  const [townId, setTownId] = useState(initialSite.town_id || '');
  const [townName, setTownName] = useState(initialSite.town?.name || '');
  const [suburbId, setSuburbId] = useState(initialSite.suburb_id || '');
  const [suburbName, setSuburbName] = useState(initialSite.suburb?.name || '');
  const [sectorId, setSectorId] = useState(initialSite.sector_id || '');
  const [estateId, setEstateId] = useState(initialSite.estate_id || '');
  const [sitePhone, setSitePhone] = useState(initialSite.site_phone || '');

  const [primaryTransmitter, setPrimaryTransmitter] = useState<string>(initialSite.primary_transmitter || 'NONE');
  const [secondaryTransmitter, setSecondaryTransmitter] = useState<string>(initialSite.secondary_transmitter || 'NONE');

  const activePrimary = initialSite.transmitters?.find((t: any) => t.role === 'PRIMARY' && t.status === 'ACTIVE');
  const activeSecondary = initialSite.transmitters?.find((t: any) => t.role === 'SECONDARY' && t.status === 'ACTIVE');
  
  const [primaryTransmitterNo, setPrimaryTransmitterNo] = useState<string>(activePrimary?.transmitter_no || '');
  const [primaryPortId, setPrimaryPortId] = useState<string>(activePrimary?.port_id || '');
  const [primaryIsBillableMonthly, setPrimaryIsBillableMonthly] = useState<boolean>(!!activePrimary?.is_billable_monthly);
  const [primaryMonthlyFee, setPrimaryMonthlyFee] = useState<string>(activePrimary?.monthly_fee?.toString() || '');
  const [primaryHasAnnualLicenseFee, setPrimaryHasAnnualLicenseFee] = useState<boolean>(!!activePrimary?.has_annual_license_fee);
  const [primaryHasAnnualGsmFee, setPrimaryHasAnnualGsmFee] = useState<boolean>(!!activePrimary?.has_annual_gsm_fee);

  const [secondaryTransmitterNo, setSecondaryTransmitterNo] = useState<string>(activeSecondary?.transmitter_no || '');
  const [secondaryPortId, setSecondaryPortId] = useState<string>(activeSecondary?.port_id || '');
  const [secondaryIsBillableMonthly, setSecondaryIsBillableMonthly] = useState<boolean>(!!activeSecondary?.is_billable_monthly);
  const [secondaryMonthlyFee, setSecondaryMonthlyFee] = useState<string>(activeSecondary?.monthly_fee?.toString() || '');
  const [secondaryHasAnnualLicenseFee, setSecondaryHasAnnualLicenseFee] = useState<boolean>(!!activeSecondary?.has_annual_license_fee);
  const [secondaryHasAnnualGsmFee, setSecondaryHasAnnualGsmFee] = useState<boolean>(!!activeSecondary?.has_annual_gsm_fee);
  
  const transmitterHistory = initialSite.transmitters || [];

  // CCTV & Access Details
  const [cctvCameraCount, setCctvCameraCount] = useState<number>(initialSite.cctv_camera_count || 0);
  const [annualMaintenanceFee, setAnnualMaintenanceFee] = useState<number>(initialSite.annual_maintenance_fee || 0);
  const [accessType, setAccessType] = useState<string>(initialSite.access_type || 'NONE');
  const [keyNumberRef, setKeyNumberRef] = useState<string>(initialSite.key_number_ref || '');
  const [keyVaultLocation, setKeyVaultLocation] = useState<string>(initialSite.key_vault_location || 'Main Office Safe');
  const [accessCodeNotes, setAccessCodeNotes] = useState<string>(initialSite.access_code_notes || '');
  const [siteOperationsNotes, setSiteOperationsNotes] = useState<string>(initialSite.site_operations_notes || '');

  // ── Email / SMS report options ─────────────────────────────────────────────
  const [emailReportOption, setEmailReportOption] = useState<string>('NONE');
  const [smsOption, setSmsOption] = useState<string>('NONE');

  // Initialize Email/SMS options in edit mode
  useEffect(() => {
    if (initialData?.services) {
      const ids = initialData.services.map((cs: any) => cs.service_id);
      if (ids.includes(9)) setEmailReportOption('DAILY');
      else if (ids.includes(10)) setEmailReportOption('WEEKLY');
      else if (ids.includes(11)) setEmailReportOption('MONTHLY');

      if (ids.includes(12)) setSmsOption('DAILY');
      else if (ids.includes(13)) setSmsOption('WEEKLY');
      else if (ids.includes(14)) setSmsOption('MONTHLY');
    }
  }, [initialData]);

  const [streets, setStreets] = useState<any[]>([]);
  const [billingCycles, setBillingCycles] = useState<any[]>([]);
  const [zoneDescriptors, setZoneDescriptors] = useState<any[]>([]);

  // ── Emergency Contacts ─────────────────────────────────────────────────────
  const initialContactsMapped: Contact[] = initialSite.emergency_contacts?.map((sec: any) => ({
    contact_id: sec.contact.id,
    full_name: sec.contact.full_name,
    primary_phone: sec.contact.primary_phone,
    secondary_phone: sec.contact.secondary_phone || '',
    email: sec.contact.email || '',
    notes: sec.notes || '',
    priority_order: sec.priority_order,
    relationship_type: sec.relationship_type,
    is_keyholder: !!sec.is_keyholder,
  })) || [{ full_name: '', primary_phone: '', priority_order: 1, relationship_type: 'Owner', is_keyholder: false }];

  const [contacts, setContacts] = useState<Contact[]>(initialContactsMapped);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactSearchResults, setContactSearchResults] = useState<any[]>([]);
  const [activeContactIndex, setActiveContactIndex] = useState<number | null>(null);

  // ── Alarms & Zones ─────────────────────────────────────────────────────────
  const [alarmMakeId, setAlarmMakeId] = useState<string>(initialData?.alarmMakeId?.toString() || '');
  const [alarmModelId, setAlarmModelId] = useState<string>(initialData?.alarmModelId?.toString() || '');
  
  const initialZonesMapped: ClientZone[] = initialData?.zones?.map((z: any) => ({
    zoneNumber: z.zoneNumber,
    zoneTypeId: z.zoneTypeId,
    description: z.description || ''
  })) || [];
  const [zones, setZones] = useState<ClientZone[]>(initialZonesMapped);

  // ── Selected Services ──────────────────────────────────────────────────────
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>(
    initialData?.services?.map((cs: any) => ({
      service_id: cs.service_id,
      negotiated_fee: cs.negotiated_fee,
      base_fee_at_booking: cs.base_fee_at_booking,
      discount_reason: cs.discount_reason || '',
    })) || []
  );

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Itemized Total Calculation ─────────────────────────────────────────────
  const itemizedTotal = selectedServices.reduce((sum, s) => sum + (parseFloat(s.negotiated_fee.toString()) || 0), 0);

  useEffect(() => {
    if (!hasManuallyOverriddenTariff) {
      setMonthlyTariff(itemizedTotal > 0 ? itemizedTotal.toFixed(2) : '');
    }
  }, [itemizedTotal, hasManuallyOverriddenTariff]);

  const handleManualTariffChange = (val: string) => {
    setMonthlyTariff(val);
    setHasManuallyOverriddenTariff(true);
  };

  const handleSyncTariff = () => {
    setMonthlyTariff(itemizedTotal > 0 ? itemizedTotal.toFixed(2) : '');
    setHasManuallyOverriddenTariff(false);
  };

  // ── Effects ────────────────────────────────────────────────────────────────

  // Fetch all lookup tables once on mount
  useEffect(() => {
    const fetchLookup = async (category: string, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
      try {
        const res = await fetch(`${API_BASE}/api/settings/${category}`, { cache: 'no-store' });
        const data = await res.json();
        if (Array.isArray(data)) {
          setter(data.filter((item: any) => item.is_active));
        } else {
          setter([]);
        }
      } catch (err) {
        console.error(`Failed to fetch lookup: ${category}`, err);
        setter([]);
      }
    };
    fetchLookup('towns', setTowns);
    fetchLookup('sectors', setSectors);
    fetchLookup('services', setServicesList);
    fetchLookup('billing-cycles', setBillingCycles);
    fetchLookup('payment-methods', setPaymentMethodsList);
    fetchLookup('zone-descriptors', setZoneDescriptors);

    const fetchAlarmsAndZones = async () => {
      try {
        const [alarmsRes, zonesRes] = await Promise.all([
          fetch(`${API_BASE}/api/settings/alarm-models`, { cache: 'no-store' }),
          fetch(`${API_BASE}/api/settings/zone-types`, { cache: 'no-store' })
        ]);
        if (alarmsRes.ok) setAlarmMakes(await alarmsRes.json());
        if (zonesRes.ok) setZoneTypes(await zonesRes.json());
      } catch (err) {
        console.error('Failed to fetch alarms or zones', err);
      }
    };
    fetchAlarmsAndZones();
  }, []);

  // Fetch streets based on suburbId (primary) or townId fallback
  useEffect(() => {
    const fetchStreets = async () => {
      if (!suburbId) {
        // If no suburb selected, clear streets
        setStreets([]);
        return;
      }
      try {
        const url = `${API_BASE}/api/settings/streets?suburb_id=${suburbId}`;
        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();
        if (Array.isArray(data)) setStreets(data.filter((item: any) => item.is_active));
        else setStreets([]);
      } catch (err) {
        console.error('Failed to fetch streets:', err);
        setStreets([]);
      }
    };
    fetchStreets();
  }, [suburbId]);

  // Fetch suburbs based on townId
  useEffect(() => {
    const fetchSuburbs = async () => {
      if (!townId) {
        setSuburbs([]);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/settings/suburbs?town_id=${townId}`, { cache: 'no-store' });
        const data = await res.json();
        if (Array.isArray(data)) setSuburbs(data.filter((item: any) => item.is_active));
      } catch (err) {
        console.error('Failed to fetch suburbs:', err);
        setSuburbs([]);
      }
    };
    fetchSuburbs();
  }, [townId]);

  // Fetch estates based on suburbId
  useEffect(() => {
    const fetchEstates = async () => {
      if (!suburbId) {
        setEstates([]);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/settings/estates?suburb_id=${suburbId}`, { cache: 'no-store' });
        const data = await res.json();
        if (Array.isArray(data)) setEstates(data.filter((item: any) => item.is_active));
      } catch (err) {
        console.error('Failed to fetch estates:', err);
        setEstates([]);
      }
    };
    fetchEstates();
  }, [suburbId]);

  // CCTV tiered fee — auto-calculate service line when camera count changes
  useEffect(() => {
    if (servicesList.length === 0) return;
    const calculatedBase = cctvCameraCount > 0 ? 250 + (cctvCameraCount - 1) * 150 : 0;
    setSelectedServices(prev => {
      const filtered = prev.filter(s => s.service_id !== 3);
      if (cctvCameraCount > 0) {
        return [...filtered, { service_id: 3, base_fee_at_booking: calculatedBase, negotiated_fee: calculatedBase, discount_reason: '' }];
      }
      return filtered;
    });
  }, [cctvCameraCount, servicesList]);

  // Sync dual transmitter selections → service line-items
  useEffect(() => {
    if (servicesList.length === 0) return;
    setSelectedServices(prev => {
      const filtered = prev.filter(s => ![5, 6, 7, 8, 15, 16].includes(s.service_id));
      const primaryList = getServicesForTransmitter(primaryTransmitter);
      const secondaryList = getServicesForTransmitter(secondaryTransmitter);
      const mergedList = [...primaryList];
      for (const item of secondaryList) {
        if (!mergedList.some(x => x.service_id === item.service_id)) {
          mergedList.push(item);
        }
      }
      const extra: SelectedService[] = mergedList.map(item => {
        const actualBase = servicesList.find(sl => sl.id === item.service_id)?.base_fee || item.base_fee;
        const fee = item.is_annual ? calculateProratedFee(clientSince, actualBase) : actualBase;
        return { service_id: item.service_id, base_fee_at_booking: fee, negotiated_fee: fee, discount_reason: '' };
      });
      return [...filtered, ...extra];
    });
  }, [primaryTransmitter, secondaryTransmitter, clientSince, servicesList]);

  // Sync email/SMS report option → service line-items
  useEffect(() => {
    if (servicesList.length === 0) return;
    setSelectedServices(prev => {
      const filtered = prev.filter(s => ![9, 10, 11, 12, 13, 14].includes(s.service_id));
      const extra: SelectedService[] = [];
      if (emailReportOption === 'DAILY') { const s = servicesList.find(x => x.id === 9); if (s) extra.push({ service_id: 9, base_fee_at_booking: s.base_fee, negotiated_fee: s.base_fee, discount_reason: '' }); }
      else if (emailReportOption === 'WEEKLY') { const s = servicesList.find(x => x.id === 10); if (s) extra.push({ service_id: 10, base_fee_at_booking: s.base_fee, negotiated_fee: s.base_fee, discount_reason: '' }); }
      else if (emailReportOption === 'MONTHLY') { const s = servicesList.find(x => x.id === 11); if (s) extra.push({ service_id: 11, base_fee_at_booking: s.base_fee, negotiated_fee: s.base_fee, discount_reason: '' }); }
      if (smsOption === 'DAILY') { const s = servicesList.find(x => x.id === 12); if (s) extra.push({ service_id: 12, base_fee_at_booking: s.base_fee, negotiated_fee: s.base_fee, discount_reason: '' }); }
      else if (smsOption === 'WEEKLY') { const s = servicesList.find(x => x.id === 13); if (s) extra.push({ service_id: 13, base_fee_at_booking: s.base_fee, negotiated_fee: s.base_fee, discount_reason: '' }); }
      else if (smsOption === 'MONTHLY') { const s = servicesList.find(x => x.id === 14); if (s) extra.push({ service_id: 14, base_fee_at_booking: s.base_fee, negotiated_fee: s.base_fee, discount_reason: '' }); }
      return [...filtered, ...extra];
    });
  }, [emailReportOption, smsOption, servicesList]);

  // Debounced contact search
  useEffect(() => {
    if (!contactSearchQuery.trim()) {
      setContactSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/contacts/search?q=${encodeURIComponent(contactSearchQuery)}`);
        const data = await res.json();
        setContactSearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Contact search failed:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [contactSearchQuery]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectExistingContact = (index: number, contact: any) => {
    const updated = [...contacts];
    updated[index] = {
      ...updated[index],
      contact_id: contact.id,
      full_name: contact.full_name,
      primary_phone: contact.primary_phone,
      secondary_phone: contact.secondary_phone || '',
      email: contact.email || '',
      notes: contact.notes || '',
    };
    setContacts(updated);
    setContactSearchQuery('');
    setContactSearchResults([]);
    setActiveContactIndex(null);
  };

  const handleServiceCheckboxToggle = (id: number, baseFee: number) => {
    if ([3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].includes(id)) return;
    setSelectedServices(prev => {
      const exists = prev.find(s => s.service_id === id);
      if (exists) return prev.filter(s => s.service_id !== id);
      return [...prev, { service_id: id, base_fee_at_booking: baseFee, negotiated_fee: baseFee, discount_reason: '' }];
    });
  };

  const handleNegotiatedFeeChange = (id: number, value: string) => {
    const numeric = parseFloat(value) || 0;
    setSelectedServices(prev => prev.map(s => s.service_id === id ? { ...s, negotiated_fee: numeric } : s));
  };

  const handleDiscountReasonChange = (id: number, value: string) => {
    setSelectedServices(prev => prev.map(s => s.service_id === id ? { ...s, discount_reason: value } : s));
  };

  const handleContactChange = (index: number, field: keyof Contact, value: any) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  const handleRemoveContact = (index: number) => {
    setContacts(prev => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((c, idx) => ({ ...c, priority_order: idx + 1 }));
    });
  };

  const handleAddContact = () => {
    setContacts(prev => [...prev, { full_name: '', primary_phone: '', priority_order: prev.length + 1, relationship_type: 'Owner', is_keyholder: false }]);
  };

  const moveContactUp = (index: number) => {
    if (index === 0) return;
    setContacts(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy.map((c, idx) => ({ ...c, priority_order: idx + 1 }));
    });
  };

  const moveContactDown = (index: number) => {
    setContacts(prev => {
      if (index === prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy.map((c, idx) => ({ ...c, priority_order: idx + 1 }));
    });
  };

  const handleZoneChange = (index: number, field: keyof ClientZone, value: any) => {
    const updated = [...zones];
    updated[index] = { ...updated[index], [field]: value };
    setZones(updated);
  };

  const handleRemoveZone = (index: number) => {
    setZones(zones.filter((_, idx) => idx !== index));
  };

  const handleAddZone = () => {
    setZones([...zones, { zoneNumber: zones.length + 1, zoneTypeId: 0, description: '' }]);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (['PHYSICAL_KEY', 'BOTH_KEY_AND_CODE'].includes(accessType) && !keyNumberRef.trim()) {
      setError('Key Register Number / Tag # is mandatory when physical key access is selected.');
      setLoading(false);
      return;
    }

    if (clientType !== 'BUSINESS' && !surname.trim()) {
      setError('Surname is a mandatory field for residential / holiday home clients.');
      setLoading(false);
      return;
    }

    for (const s of selectedServices) {
      if (s.negotiated_fee < s.base_fee_at_booking && !s.discount_reason.trim()) {
        setError(`A "Reason for Tariff Negotiation" is required for Service: ${servicesList.find(sl => sl.id === s.service_id)?.name}`);
        setLoading(false);
        return;
      }
    }

    const payload = {
      version: initialData?.version,
      client_type: clientType,
      title: clientType !== 'BUSINESS' ? title : null,
      first_name: clientType !== 'BUSINESS' ? firstName : null,
      surname: clientType !== 'BUSINESS' ? surname : null,
      company_name: clientType === 'BUSINESS' ? companyName : null,
      vat_no: clientType === 'BUSINESS' ? vatNo : null,
      company_reg_no: clientType === 'BUSINESS' ? companyRegNo : null,
      id_passport_no: clientType !== 'BUSINESS' ? idPassportNo : null,
      billing_cycle: billingCycle,
      anniversary_month: anniversaryMonth,
      client_since: clientSince,
      payment_method: paymentMethod,
      monthly_tariff: monthlyTariff,
      bank_name: paymentMethod.toLowerCase().includes('debit order') ? bankName : null,
      account_type: paymentMethod.toLowerCase().includes('debit order') ? accountType : null,
      branch_code: paymentMethod.toLowerCase().includes('debit order') ? branchCode : null,
      account_no: accountNo || null,
      cc_provider: paymentMethod.toLowerCase().includes('debit order') ? accountHolderName : null,
      site: {
        site_name: siteName,
        street_number: streetNumber || null,
        unit_number: unitNumber || null,
        street_name: streetName || null,
        street_id: streetId ? parseInt(streetId.toString()) : null,
        town_id: townId ? parseInt(townId.toString()) : null,
        suburb_id: suburbId ? parseInt(suburbId.toString()) : null,
        sector_id: sectorId ? parseInt(sectorId.toString()) : null,
        estate_id: estateId ? parseInt(estateId.toString()) : null,
        site_phone: sitePhone,
        primary_transmitter: primaryTransmitter,
        secondary_transmitter: secondaryTransmitter,
        primary_transmitter_no: primaryTransmitterNo || null,
        primary_port_id: primaryPortId || null,
        primary_is_billable_monthly: primaryIsBillableMonthly,
        primary_monthly_fee: primaryMonthlyFee ? parseFloat(primaryMonthlyFee) : null,
        primary_has_annual_license_fee: primaryHasAnnualLicenseFee,
        primary_has_annual_gsm_fee: primaryHasAnnualGsmFee,
        secondary_transmitter_no: secondaryTransmitterNo || null,
        secondary_port_id: secondaryPortId || null,
        secondary_is_billable_monthly: secondaryIsBillableMonthly,
        secondary_monthly_fee: secondaryMonthlyFee ? parseFloat(secondaryMonthlyFee) : null,
        secondary_has_annual_license_fee: secondaryHasAnnualLicenseFee,
        secondary_has_annual_gsm_fee: secondaryHasAnnualGsmFee,
        cctv_camera_count: cctvCameraCount,
        annual_maintenance_fee: annualMaintenanceFee,
        access_type: accessType,
        key_number_ref: keyNumberRef || null,
        key_vault_location: keyVaultLocation || 'Main Office Safe',
        access_code_notes: accessCodeNotes || null,
        site_operations_notes: siteOperationsNotes || null,
      },
      emergency_contacts: contacts.filter(c => c.full_name && c.primary_phone),
      services: selectedServices,
      alarmMakeId,
      alarmModelId,
      zones: zones.filter(z => z.zoneNumber && z.zoneTypeId),
    };

    const url = mode === 'add'
      ? `${API_BASE}/api/clients`
      : `${API_BASE}/api/clients/${initialData.id}`;
    const method = mode === 'add' ? 'POST' : 'PUT';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 409) {
        throw new Error('Conflict: This client has been updated by another user. Please cancel and reload.');
      }
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save client details');
      }
      onSubmitSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const generalServices = servicesList.filter(s => ![3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].includes(s.id));

  return {
    // Lookup data
    towns, suburbs, sectors, estates, servicesList, generalServices, alarmMakes, zoneTypes,
    // Client particulars
    clientType, setClientType,
    title, setTitle,
    firstName, setFirstName,
    surname, setSurname,
    companyName, setCompanyName,
    vatNo, setVatNo,
    companyRegNo, setCompanyRegNo,
    idPassportNo, setIdPassportNo,
    billingCycle, setBillingCycle,
    clientSince, setClientSince,
    anniversaryMonth, setAnniversaryMonth,
    // Payment
    paymentMethod, setPaymentMethod,
    bankName, setBankName,
    accountType, setAccountType,
    branchCode, setBranchCode,
    accountNo, setAccountNo,
    accountHolderName, setAccountHolderName,
    monthlyTariff, setMonthlyTariff: handleManualTariffChange,
    itemizedTotal, handleSyncTariff,
    // Site
    siteName, setSiteName,
    streetNumber, setStreetNumber,
    unitNumber, setUnitNumber,
    streetName, setStreetName,
    streetId, setStreetId,
    townId, setTownId,
    townName, setTownName,
    suburbId, setSuburbId,
    suburbName, setSuburbName,
    sectorId, setSectorId,
    estateId, setEstateId,
    sitePhone, setSitePhone,
    primaryTransmitter, setPrimaryTransmitter,
    secondaryTransmitter, setSecondaryTransmitter,
    primaryTransmitterNo, setPrimaryTransmitterNo,
    primaryPortId, setPrimaryPortId,
    primaryIsBillableMonthly, setPrimaryIsBillableMonthly,
    primaryMonthlyFee, setPrimaryMonthlyFee,
    primaryHasAnnualLicenseFee, setPrimaryHasAnnualLicenseFee,
    primaryHasAnnualGsmFee, setPrimaryHasAnnualGsmFee,
    
    secondaryTransmitterNo, setSecondaryTransmitterNo,
    secondaryPortId, setSecondaryPortId,
    secondaryIsBillableMonthly, setSecondaryIsBillableMonthly,
    secondaryMonthlyFee, setSecondaryMonthlyFee,
    secondaryHasAnnualLicenseFee, setSecondaryHasAnnualLicenseFee,
    secondaryHasAnnualGsmFee, setSecondaryHasAnnualGsmFee,
    
    transmitterHistory,
    cctvCameraCount, setCctvCameraCount,
    annualMaintenanceFee, setAnnualMaintenanceFee,
    accessType, setAccessType,
    keyNumberRef, setKeyNumberRef,
    keyVaultLocation, setKeyVaultLocation,
    accessCodeNotes, setAccessCodeNotes,
    siteOperationsNotes, setSiteOperationsNotes,
    // Notifications
    emailReportOption, setEmailReportOption,
    smsOption, setSmsOption,
    // Contacts
    contacts, setContacts,
    contactSearchQuery, setContactSearchQuery,
    contactSearchResults,
    activeContactIndex, setActiveContactIndex,
    handleSelectExistingContact,
    handleContactChange,
    handleRemoveContact,
    handleAddContact,
    moveContactUp,
    moveContactDown,
    // Alarms & Zones
    alarmMakeId, setAlarmMakeId,
    alarmModelId, setAlarmModelId,
    zones, setZones,
    handleZoneChange,
    handleRemoveZone,
    handleAddZone,
    // Services
    selectedServices,
    handleServiceCheckboxToggle,
    handleNegotiatedFeeChange,
    handleDiscountReasonChange,
    // Proration helpers (needed by ServicesSection)
    getDaysRemainingUntilDec1,
    // Lookups
    streets, billingCycles, paymentMethodsList, zoneDescriptors,
    // Form submission
    loading, error,
    handleSubmit,
  };
}
