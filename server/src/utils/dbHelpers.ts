import { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Shared deep-include used by GET /api/clients, GET /api/clients/:id,
// and the re-fetch after POST /api/clients.
// ---------------------------------------------------------------------------
export const CLIENT_INCLUDE = {
  sites: {
    include: {
      town: true,
      suburb: true,
      sector: true,
      estate: true,
      street: true,
      emergency_contacts: {
        include: {
          contact: true
        },
        orderBy: {
          priority_order: 'asc'
        }
      },
      transmitters: {
        include: {
          partitions: true
        },
        orderBy: {
          assigned_at: 'desc'
        }
      }
    }
  },
  services: {
    include: {
      service: true
    }
  },
  alarmMake: true,
  alarmModel: true,
  zones: {
    include: {
      zoneType: true
    }
  }
} as const;

// ---------------------------------------------------------------------------
// Build the Prisma `data` object for creating a brand-new site.
// Used in POST /api/clients.
// ---------------------------------------------------------------------------
export function buildNewSiteData(clientId: number, site: any) {
  return {
    client_id: clientId,
    site_name: site.site_name || 'Primary Site',
    street_address: site.street_address || '',
    street_number: site.street_number || null,
    unit_number: site.unit_number || null,
    street_name: site.street_name || null,
    street_id: site.street_id ? parseInt(site.street_id.toString()) : null,
    town_id: site.town_id ? parseInt(site.town_id.toString()) : null,
    suburb_id: site.suburb_id ? parseInt(site.suburb_id.toString()) : null,
    sector_id: site.sector_id ? parseInt(site.sector_id.toString()) : null,
    estate_id: site.estate_id ? parseInt(site.estate_id.toString()) : null,
    site_phone: site.site_phone ?? null,
    primary_transmitter: site.primary_transmitter || 'NONE',
    secondary_transmitter: site.secondary_transmitter || 'NONE',
    cctv_camera_count: site.cctv_camera_count ? parseInt(site.cctv_camera_count.toString()) : 0,
    annual_maintenance_fee: site.annual_maintenance_fee
      ? parseFloat(site.annual_maintenance_fee.toString())
      : 0,
    access_type: site.access_type || 'NONE',
    key_number_ref: site.key_number_ref || null,
    key_vault_location: site.key_vault_location || 'Main Office Safe',
    access_code_notes: site.access_code_notes || null,
    site_operations_notes: site.site_operations_notes || null
  };
}

// ---------------------------------------------------------------------------
// Calculate if billing data is incomplete
// ---------------------------------------------------------------------------
export function calculateIsBillingIncomplete(data: any): boolean {
  if (!data.payment_method || data.payment_method.trim() === '') return true;
  if (!data.billing_cycle || data.billing_cycle.trim() === '') return true;
  if (!data.account_no || data.account_no.trim() === '') return true;
  if (data.monthly_tariff === undefined || data.monthly_tariff === null || data.monthly_tariff === '') return true;
  return false;
}

// ---------------------------------------------------------------------------
// Type alias for the Prisma transaction client passed inside $transaction.
// ---------------------------------------------------------------------------
type TxClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

// ---------------------------------------------------------------------------
// Upsert services + audit tariff adjustments inside a transaction.
// Called by both POST and PUT handlers with the resolved `clientId`.
// ---------------------------------------------------------------------------
export async function upsertServicesInTransaction(
  tx: TxClient,
  clientId: number,
  services: any[]
) {
  for (const s of services) {
    const isNegotiated = s.negotiated_fee < s.base_fee_at_booking;
    await tx.clientService.create({
      data: {
        client_id: clientId,
        service_id: parseInt(s.service_id.toString()),
        negotiated_fee: parseFloat(s.negotiated_fee.toString()),
        base_fee_at_booking: parseFloat(s.base_fee_at_booking.toString()),
        discount_reason: s.discount_reason || null,
        is_negotiated: isNegotiated
      }
    });

    if (isNegotiated) {
      await tx.auditTariffAdjustment.create({
        data: {
          client_id: clientId,
          service_id: parseInt(s.service_id.toString()),
          base_fee: parseFloat(s.base_fee_at_booking.toString()),
          negotiated_fee: parseFloat(s.negotiated_fee.toString()),
          variance:
            parseFloat(s.base_fee_at_booking.toString()) -
            parseFloat(s.negotiated_fee.toString()),
          reason: s.discount_reason || 'Negotiated discount applied',
          captured_by: 'System Agent'
        }
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Upsert emergency contacts + site junction rows inside a transaction.
// Called by both POST and PUT handlers.
// ---------------------------------------------------------------------------
export async function upsertContactsInTransaction(
  tx: TxClient,
  siteId: number,
  emergency_contacts: any[]
) {
  for (const ec of emergency_contacts) {
    let contactId = ec.contact_id;

    if (!contactId && ec.full_name && ec.primary_phone) {
      const newContact = await tx.emergencyContact.create({
        data: {
          full_name: ec.full_name,
          primary_phone: ec.primary_phone,
          secondary_phone: ec.secondary_phone || null,
          email: ec.email || null,
          notes: ec.notes || null
        }
      });
      contactId = newContact.id;
    }

    if (contactId) {
      await tx.siteEmergencyContact.create({
        data: {
          site_id: siteId,
          contact_id: contactId,
          priority_order: parseInt(ec.priority_order.toString()),
          relationship_type: ec.relationship_type,
          is_keyholder: !!ec.is_keyholder,
          notes: ec.notes || null
        }
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Upsert client zones inside a transaction.
// Called by both POST and PUT handlers.
// ---------------------------------------------------------------------------
export async function upsertZonesInTransaction(
  tx: TxClient,
  clientId: number,
  zones: any[]
) {
  for (const zone of zones) {
    if (zone.zoneTypeId && zone.zoneNumber) {
      await tx.clientZone.create({
        data: {
          clientId,
          zoneNumber: parseInt(zone.zoneNumber.toString()),
          zoneTypeId: parseInt(zone.zoneTypeId.toString()),
          description: zone.description || null
        }
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Generate next safe account number
// ---------------------------------------------------------------------------
export async function generateNextSafeAccountNumber(tx: TxClient): Promise<string> {
  const lastClient = await tx.client.findFirst({
    where: { customer_no: { startsWith: 'SAFE' } },
    orderBy: { customer_no: 'desc' }
  });
  if (!lastClient) return 'SAFE10001';
  const num = parseInt(lastClient.customer_no.replace('SAFE', ''), 10);
  if (isNaN(num)) return 'SAFE10001';
  return `SAFE${num + 1}`;
}

// ---------------------------------------------------------------------------
// Upsert transmitters in transaction
// ---------------------------------------------------------------------------
export async function upsertTransmittersInTransaction(
  tx: TxClient,
  siteId: number,
  primaryTransmitterNo?: string,
  primaryPortId?: string,
  primaryIsBillableMonthly?: boolean,
  primaryMonthlyFee?: number | null,
  primaryHasAnnualLicenseFee?: boolean,
  primaryHasAnnualGsmFee?: boolean,
  secondaryTransmitterNo?: string,
  secondaryPortId?: string,
  secondaryIsBillableMonthly?: boolean,
  secondaryMonthlyFee?: number | null,
  secondaryHasAnnualLicenseFee?: boolean,
  secondaryHasAnnualGsmFee?: boolean
) {
  const handleRole = async (
    role: string, 
    tNo?: string, 
    pId?: string, 
    isBillable?: boolean, 
    monthlyFee?: number | null, 
    annualLicense?: boolean, 
    annualGsm?: boolean
  ) => {
    const active = await tx.siteTransmitter.findFirst({
      where: { site_id: siteId, role, status: 'ACTIVE' }
    });

    // If both are empty/falsy, maybe they cleared the transmitter
    if (!tNo) {
      if (active) {
        await tx.siteTransmitter.update({
          where: { id: active.id },
          data: {
            status: 'RETIRED',
            retired_at: new Date(),
            replacement_note: 'Removed by user'
          }
        });
      }
      return;
    }

    if (active && active.transmitter_no === tNo && active.port_id === (pId || null)) {
      return; // No change
    }

    if (active) {
      await tx.siteTransmitter.update({
        where: { id: active.id },
        data: {
          status: 'RETIRED',
          retired_at: new Date(),
          replacement_note: `Replaced by ${tNo}`
        }
      });
    }

    await tx.siteTransmitter.create({
      data: {
        site_id: siteId,
        role,
        transmitter_no: tNo,
        port_id: pId || null,
        status: 'ACTIVE',
        is_billable_monthly: isBillable || false,
        monthly_fee: monthlyFee || null,
        has_annual_license_fee: annualLicense || false,
        has_annual_gsm_fee: annualGsm || false,
        assigned_at: new Date()
      }
    });
  };

  await handleRole('PRIMARY', primaryTransmitterNo, primaryPortId, primaryIsBillableMonthly, primaryMonthlyFee, primaryHasAnnualLicenseFee, primaryHasAnnualGsmFee);
  await handleRole('SECONDARY', secondaryTransmitterNo, secondaryPortId, secondaryIsBillableMonthly, secondaryMonthlyFee, secondaryHasAnnualLicenseFee, secondaryHasAnnualGsmFee);
}

