import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  CLIENT_INCLUDE,
  buildNewSiteData,
  upsertServicesInTransaction,
  upsertContactsInTransaction,
  upsertZonesInTransaction,
  calculateIsBillingIncomplete,
  generateNextSafeAccountNumber,
  upsertTransmittersInTransaction
} from '../utils/dbHelpers';

const router = Router();
const prisma = new PrismaClient();

// Helper to compile address string dynamically
async function compileAddress(tx: any, site: any): Promise<string> {
  if (site.street_address && site.street_address.trim() !== '') {
    return site.street_address;
  }
  let parts = [];
  if (site.unit_number) {
    parts.push(site.unit_number);
    if (site.estate_id) {
      const estate = await tx.estate.findUnique({ where: { id: parseInt(site.estate_id.toString()) } });
      if (estate) parts.push(estate.name);
    }
  }
  if (site.street_number) parts.push(site.street_number);
  if (site.street_name) parts.push(site.street_name);
  return parts.join(', ');
}

// ---------------------------------------------------------------------------
// GET /api/clients  — list with optional search & archived filter
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response) => {
  const { search, archived, filter } = req.query;
  const isActive = archived !== 'true';

  let whereClause: any = { is_active: isActive };
  
  if (req.query.all === 'true') {
    delete whereClause.is_active;
  }

  if (filter === 'flagged') {
    whereClause.is_billing_incomplete = true;
    delete whereClause.is_active; // maybe we want to see flagged regardless of active state
  }

  if (search && typeof search === 'string') {
    const searchTrimmed = search.trim();
    const searchNumeric = searchTrimmed.replace(/\D/g, ''); // strip non-numeric
    whereClause.OR = [
      { company_name: { contains: searchTrimmed } },
      { first_name: { contains: searchTrimmed } },
      { surname: { contains: searchTrimmed } },
      ...(searchNumeric ? [{ customer_no: { contains: searchNumeric } }] : [{ customer_no: { contains: searchTrimmed } }]),
      {
        sites: {
          some: {
            OR: [
              { site_phone: { contains: searchTrimmed } },
              { street_address: { contains: searchTrimmed } },
              { town: { name: { contains: searchTrimmed } } },
              { suburb: { name: { contains: searchTrimmed } } },
              { sector: { name: { contains: searchTrimmed } } }
            ]
          }
        }
      }
    ];
  }

  try {
    const clients = await prisma.client.findMany({
      where: whereClause,
      include: CLIENT_INCLUDE,
      orderBy: { created_at: 'desc' }
    });
    res.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/clients/:id  — single client
// ---------------------------------------------------------------------------
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(id) },
      include: CLIENT_INCLUDE
    });
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(client);
  } catch (error) {
    console.error('Error fetching client details:', error);
    res.status(500).json({ error: 'Failed to fetch client details' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/clients  — create client in a transaction
// ---------------------------------------------------------------------------
router.post('/', async (req: Request, res: Response) => {
  const {
    client_type,
    title,
    first_name,
    surname,
    company_name,
    vat_no,
    company_reg_no,
    id_passport_no,
    billing_cycle,
    anniversary_month,
    client_since,
    payment_method,
    bank_name,
    account_type,
    branch_code,
    account_no,
    cc_provider, // Used for Netcash Account Holder Name
    monthly_tariff,
    site,
    emergency_contacts,
    services, // Array of { service_id, negotiated_fee, base_fee_at_booking, discount_reason }
    alarmMakeId,
    alarmModelId,
    zones // Array of { zoneNumber, zoneTypeId, description }
  } = req.body;

  try {
    const newClient = await prisma.$transaction(async (tx) => {
      const safeCustomerNo = await generateNextSafeAccountNumber(tx as any);

      // 1. Create client record
      const client = await tx.client.create({
        data: {
          customer_no: safeCustomerNo,
          client_type,
          title,
          first_name,
          surname,
          company_name,
          vat_no,
          company_reg_no,
          id_passport_no,
          billing_cycle,
          anniversary_month: anniversary_month ? parseInt(anniversary_month.toString()) : 1,
          client_since: client_since ? new Date(client_since) : new Date(),
          is_active: true,
          version: 1,
          captured_by: 'System Agent',
          captured_date: new Date(),
          payment_method: payment_method || 'EFT',
          bank_name,
          account_type,
          branch_code,
          account_no,
          cc_provider,
          monthly_tariff: monthly_tariff !== undefined ? parseFloat(monthly_tariff) : null,
          is_billing_incomplete: calculateIsBillingIncomplete(req.body),
          alarmMakeId: alarmMakeId ? parseInt(alarmMakeId.toString()) : null,
          alarmModelId: alarmModelId ? parseInt(alarmModelId.toString()) : null
        }
      });

      // 2. Create services + audit rows
      if (services && Array.isArray(services)) {
        await upsertServicesInTransaction(tx, client.id, services);
      }

      // 3. Create primary site
      let createdSite;
      if (site) {
        site.street_address = await compileAddress(tx, site);
        createdSite = await tx.site.create({ data: buildNewSiteData(client.id, site) });
        await upsertTransmittersInTransaction(
          tx as any,
          createdSite.id,
          site.primary_transmitter_no,
          site.primary_port_id,
          site.primary_is_billable_monthly,
          site.primary_monthly_fee,
          site.primary_has_annual_license_fee,
          site.primary_has_annual_gsm_fee,
          site.secondary_transmitter_no,
          site.secondary_port_id,
          site.secondary_is_billable_monthly,
          site.secondary_monthly_fee,
          site.secondary_has_annual_license_fee,
          site.secondary_has_annual_gsm_fee
        );
      }

      // 4. Create emergency contact linkages
      if (emergency_contacts && Array.isArray(emergency_contacts) && createdSite) {
        await upsertContactsInTransaction(tx, createdSite.id, emergency_contacts);
      }

      // 5. Create alarm zones
      if (zones && Array.isArray(zones)) {
        await upsertZonesInTransaction(tx, client.id, zones);
      }

      return client;
    });

    // Re-fetch with full relations for the response
    const fullClient = await prisma.client.findUnique({
      where: { id: newClient.id },
      include: CLIENT_INCLUDE
    });

    res.status(201).json(fullClient);
  } catch (error) {
    console.error('Error creating client in transaction:', error);
    res.status(500).json({ error: 'Failed to create client record' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/clients/:id  — update client with optimistic concurrency control
// ---------------------------------------------------------------------------
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    version,
    client_type,
    title,
    first_name,
    surname,
    company_name,
    vat_no,
    company_reg_no,
    id_passport_no,
    billing_cycle,
    anniversary_month,
    client_since,
    payment_method,
    bank_name,
    account_type,
    branch_code,
    account_no,
    cc_provider, // Used for Netcash Account Holder Name
    monthly_tariff,
    site,
    emergency_contacts,
    services, // Array of { service_id, negotiated_fee, base_fee_at_booking, discount_reason }
    alarmMakeId,
    alarmModelId,
    zones // Array of { zoneNumber, zoneTypeId, description }
  } = req.body;

  try {
    const clientId = parseInt(id);
    const existingClient = await prisma.client.findUnique({ where: { id: clientId } });

    if (!existingClient) {
      return res.status(404).json({ error: 'Client not found' });
    }

    if (existingClient.version !== parseInt(version)) {
      return res.status(409).json({
        error: 'Conflict: The record has been modified by another process. Please reload and try again.'
      });
    }

    const updatedClient = await prisma.$transaction(async (tx) => {
      // 1. Update client particulars + bump OCC version
      const client = await tx.client.update({
        where: { id: clientId },
        data: {
          client_type,
          title,
          first_name,
          surname,
          company_name,
          vat_no,
          company_reg_no,
          id_passport_no,
          billing_cycle,
          anniversary_month: anniversary_month
            ? parseInt(anniversary_month.toString())
            : existingClient.anniversary_month,
          client_since: client_since ? new Date(client_since) : existingClient.client_since,
          version: existingClient.version + 1,
          payment_method,
          bank_name,
          account_type,
          branch_code,
          account_no,
          cc_provider,
          monthly_tariff: monthly_tariff !== undefined ? parseFloat(monthly_tariff) : existingClient.monthly_tariff,
          is_billing_incomplete: calculateIsBillingIncomplete(req.body),
          alarmMakeId: alarmMakeId ? parseInt(alarmMakeId.toString()) : null,
          alarmModelId: alarmModelId ? parseInt(alarmModelId.toString()) : null
        }
      });

      // 2. Replace services (delete-all then re-create)
      await tx.clientService.deleteMany({ where: { client_id: clientId } });
      if (services && Array.isArray(services)) {
        await upsertServicesInTransaction(tx, clientId, services);
      }

      // 3. Update or create site
      let activeSiteId: number | null = null;
      if (site) {
        site.street_address = await compileAddress(tx, site);
        const existingSite = await tx.site.findFirst({ where: { client_id: clientId } });

        if (existingSite) {
          activeSiteId = existingSite.id;
          await tx.site.update({
            where: { id: existingSite.id },
            data: {
              site_name: site.site_name || existingSite.site_name,
              street_address: site.street_address || existingSite.street_address,
              street_number: site.street_number !== undefined ? site.street_number : existingSite.street_number,
              unit_number: site.unit_number !== undefined ? site.unit_number : existingSite.unit_number,
              street_name: site.street_name !== undefined ? site.street_name : existingSite.street_name,
              street_id: site.street_id ? parseInt(site.street_id.toString()) : null,
              town_id: site.town_id ? parseInt(site.town_id.toString()) : null,
              suburb_id: site.suburb_id ? parseInt(site.suburb_id.toString()) : null,
              sector_id: site.sector_id ? parseInt(site.sector_id.toString()) : null,
              estate_id: site.estate_id ? parseInt(site.estate_id.toString()) : null,
              site_phone: site.site_phone,
              primary_transmitter: site.primary_transmitter || existingSite.primary_transmitter,
              secondary_transmitter:
                site.secondary_transmitter || existingSite.secondary_transmitter,
              cctv_camera_count: site.cctv_camera_count
                ? parseInt(site.cctv_camera_count.toString())
                : existingSite.cctv_camera_count,
              annual_maintenance_fee: site.annual_maintenance_fee
                ? parseFloat(site.annual_maintenance_fee.toString())
                : existingSite.annual_maintenance_fee,
              access_type: site.access_type || existingSite.access_type,
              key_number_ref:
                site.key_number_ref !== undefined
                  ? site.key_number_ref
                  : existingSite.key_number_ref,
              key_vault_location:
                site.key_vault_location !== undefined
                  ? site.key_vault_location
                  : existingSite.key_vault_location,
              access_code_notes:
                site.access_code_notes !== undefined
                  ? site.access_code_notes
                  : existingSite.access_code_notes,
              site_operations_notes:
                site.site_operations_notes !== undefined
                  ? site.site_operations_notes
                  : existingSite.site_operations_notes
            }
          });
        } else {
          const newSite = await tx.site.create({ data: buildNewSiteData(clientId, site) });
          activeSiteId = newSite.id;
        }

        await upsertTransmittersInTransaction(
          tx as any,
          activeSiteId,
          site.primary_transmitter_no,
          site.primary_port_id,
          site.primary_is_billable_monthly,
          site.primary_monthly_fee,
          site.primary_has_annual_license_fee,
          site.primary_has_annual_gsm_fee,
          site.secondary_transmitter_no,
          site.secondary_port_id,
          site.secondary_is_billable_monthly,
          site.secondary_monthly_fee,
          site.secondary_has_annual_license_fee,
          site.secondary_has_annual_gsm_fee
        );
      }

      // 4. Replace emergency contact junction (delete-all then re-create)
      if (activeSiteId) {
        await tx.siteEmergencyContact.deleteMany({ where: { site_id: activeSiteId } });
        if (emergency_contacts && Array.isArray(emergency_contacts)) {
          await upsertContactsInTransaction(tx, activeSiteId, emergency_contacts);
        }
      }

      // 5. Replace alarm zones (delete-all then re-create)
      await tx.clientZone.deleteMany({ where: { clientId: clientId } });
      if (zones && Array.isArray(zones)) {
        await upsertZonesInTransaction(tx, clientId, zones);
      }

      return client;
    });

    res.json(updatedClient);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Failed to update client record' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/clients/:id/archive
// ---------------------------------------------------------------------------
router.patch('/:id/archive', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const client = await prisma.client.update({
      where: { id: parseInt(id) },
      data: { is_active: false }
    });
    res.json(client);
  } catch (error) {
    console.error('Error archiving client:', error);
    res.status(500).json({ error: 'Failed to archive client' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/clients/:id/reactivate
// ---------------------------------------------------------------------------
router.patch('/:id/reactivate', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const client = await prisma.client.update({
      where: { id: parseInt(id) },
      data: { is_active: true }
    });
    res.json(client);
  } catch (error) {
    console.error('Error reactivating client:', error);
    res.status(500).json({ error: 'Failed to reactivate client' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/clients/split-tenant
// ---------------------------------------------------------------------------
router.post('/split-tenant', async (req: Request, res: Response) => {
  const { partition_id } = req.body;
  if (!partition_id) return res.status(400).json({ error: 'partition_id is required' });
  
  try {
    const partition = await prisma.siteTransmitterPartition.findUnique({
      where: { id: parseInt(partition_id) },
      include: {
        transmitter: {
          include: { site: { include: { client: true } } }
        }
      }
    });

    if (!partition) return res.status(404).json({ error: 'Partition not found' });
    if (partition.billed_client_id) return res.status(400).json({ error: 'Partition already billed to a client' });

    const parentClient = partition.transmitter.site.client;
    const site = partition.transmitter.site;

    const newClient = await prisma.$transaction(async (tx) => {
      // Create new client
      const createdClient = await tx.client.create({
        data: {
          customer_no: `${parentClient.customer_no}-P${partition.partition_no}`,
          client_type: 'BUSINESS',
          company_name: partition.label || `${parentClient.company_name} - Tenant`,
          anniversary_month: 1,
          client_since: new Date(),
          payment_method: 'EFT',
          is_active: true,
          is_billing_incomplete: true // Flagged for billing details
        }
      });

      // Create new site inherited from parent
      await tx.site.create({
        data: {
          client_id: createdClient.id,
          site_name: site.site_name,
          street_address: site.street_address,
          street_number: site.street_number,
          unit_number: site.unit_number,
          street_name: site.street_name,
          town_id: site.town_id,
          suburb_id: site.suburb_id,
          sector_id: site.sector_id,
          estate_id: site.estate_id
        }
      });

      // Link partition to new client
      await tx.siteTransmitterPartition.update({
        where: { id: partition.id },
        data: { 
          billed_client_id: createdClient.id,
          is_billable: true
        }
      });

      return createdClient;
    });

    res.status(201).json(newClient);
  } catch (error) {
    console.error('Error splitting tenant:', error);
    res.status(500).json({ error: 'Failed to split tenant' });
  }
});

export default router;
