import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i += 1) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
}

function stringSimilarity(s1: string, s2: string): number {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  let longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  return (longerLength - levenshtein(longer, shorter)) / parseFloat(longerLength.toString());
}

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });
// POST /api/reconciliation/upload
// ---------------------------------------------------------------------------
router.post('/upload', upload.fields([
  { name: 'xero', maxCount: 1 },
  { name: 'netcash', maxCount: 1 },
  { name: 'patriot', maxCount: 1 }
]), async (req: Request, res: Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    let xeroData: any[] = [];
    let patriotData: any[] = [];
    let netcashData: any[] = [];

    // Parse Xero (CSV)
    if (files['xero'] && files['xero'][0]) {
      const str = files['xero'][0].buffer.toString('utf8');
      xeroData = parse(str, { columns: true, skip_empty_lines: true, relax_column_count: true });
    }

    // Parse Patriot (CSV or Excel)
    if (files['patriot'] && files['patriot'][0]) {
      const isCsv = files['patriot'][0].originalname.toLowerCase().endsWith('.csv');
      if (isCsv) {
        const str = files['patriot'][0].buffer.toString('utf8');
        patriotData = parse(str, { columns: true, skip_empty_lines: true, relax_column_count: true });
      } else {
        const wb = xlsx.read(files['patriot'][0].buffer, { type: 'buffer' });
        wb.SheetNames.forEach(sheetName => {
          const sheet = wb.Sheets[sheetName];
          const sheetData = xlsx.utils.sheet_to_json(sheet);
          patriotData = patriotData.concat(sheetData);
        });
      }
    }

    // Parse Netcash (Excel)
    if (files['netcash'] && files['netcash'][0]) {
      const wb = xlsx.read(files['netcash'][0].buffer, { type: 'buffer' });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      netcashData = xlsx.utils.sheet_to_json(firstSheet);
    }

    // --- Clear previous unallocated hardware cache before re-parsing ---
    await prisma.unallocatedHardware.deleteMany({});

    let seededClientCount = 0;

    // --- STAGE 1: Auto-Seed Client Master List ---
    for (const row of xeroData) {
      try {
        const refRaw = row['Reference'] || row['AccountCode'] || row['InvoiceNumber'] || '';
        const nameRaw = row['*ContactName'] || row['ContactName'] || row['Contact Name'] || row['Client Name'] || row['Name'] || '';
        const ref = String(refRaw).trim();
        const name = String(nameRaw).trim();
        const amtRaw = row['UnitAmount'] || row['Total'] || row['Amount'] || 0;
        const monthlyTariff = parseFloat(String(amtRaw)) || 0;

        if (!ref || !name) continue;
        
        await prisma.client.upsert({
          where: { customer_no: ref },
          update: { company_name: name, monthly_tariff: monthlyTariff },
          create: {
            customer_no: ref,
            agreement_ref_number: ref,
            client_type: 'BUSINESS',
            anniversary_month: 1,
            client_since: new Date(),
            payment_method: 'EFT',
            company_name: name,
            monthly_tariff: monthlyTariff,
            is_active: true
          }
        });
        seededClientCount++;
      } catch (err) {
        console.error('Error upserting Xero client:', err);
      }
    }

    for (const row of netcashData) {
      try {
        const ref = String(row['Reference'] || '').trim();
        const name = String(row['AccountName'] || '').trim();
        if (!ref || !name) continue;
        
        await prisma.client.upsert({
          where: { customer_no: ref },
          update: { company_name: name, payment_method: 'DEBIT_ORDER_NETCASH' },
          create: {
            customer_no: ref,
            agreement_ref_number: ref,
            client_type: 'BUSINESS',
            anniversary_month: 1,
            client_since: new Date(),
            payment_method: 'DEBIT_ORDER_NETCASH',
            company_name: name,
            is_active: true
          }
        });
        seededClientCount++;
      } catch (err) {
        console.error('Error upserting Netcash client:', err);
      }
    }
    
    console.log(`Successfully seeded ${seededClientCount} clients from Xero/Netcash exports.`);

    // Fetch all clients + active transmitters (now includes newly seeded ones)
    const clients = await prisma.client.findMany({
      where: { is_active: true },
      include: {
        sites: {
          include: {
            transmitters: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      }
    });

    // Fetch all internal equipment - keyed by exact rawRef transmitter_no for strict lookup
    const internalEquipment = await prisma.internalEquipment.findMany();
    // Build a Set of exact rawRef strings for O(1) lookup
    const internalRawRefSet = new Set(internalEquipment.map(i => i.transmitter_no));

    let matchedAndBilled = 0;
    let unbilledPatriot = 0;
    let missingNetcashMandates = 0;
    let radioSwapsDetected = 0;
    let coveredUnderPrimary = 0;
    let internalNonBillableCount = 0;
    let matchedViaBodyCorporate = 0;
    let unlinkedCommercialTenant = 0;

    // Separate arrays for clean staging categories
    const reconciled: any[] = [];
    const unbilled: any[] = [];
    const primary: any[] = [];
    const radioSwaps: any[] = [];
    const internal: any[] = [];
    const unallocated: any[] = [];
    const bodyCorporate: any[] = [];
    const unlinkedCommercial: any[] = [];
    let stagingRows: any[] = [];
    
    // Sort patriotData to ensure partition '0000' (or lowest) comes first for the same base_tx
    patriotData.sort((a, b) => {
        const refA = String(a['Client_No_Raw'] || a['Account reference'] || a['Client_No'] || '').trim();
        const refB = String(b['Client_No_Raw'] || b['Account reference'] || b['Client_No'] || '').trim();
        return refA.localeCompare(refB);
    });

    const matchedBaseTxSet = new Set<string>();
    
    // 1. Detect Swaps & Discrepancies from Patriot Data
    for (const row of patriotData) {
      try {
        let portId = String(row['Port'] || '').trim();
        let ref = String(row['Client_No_Raw'] || row['Account reference'] || row['Client_No'] || row['Account_No'] || row['Reference'] || row['Account'] || row['ClientNo'] || '').trim();
        const name = String(row['Client_Name'] || row['Customer Name'] || row['Name'] || row['Account name'] || row['Client Name'] || '').trim();
        const extRef = String(row['External_Ref_No'] || row['ExternalRefNo'] || '').trim();

        if (!portId && !ref) continue;

        // 1. Ghost Alarm Suppression & Internal Hardware Hard-Filter
        const uName = name.toUpperCase();
        if (uName.includes('GHOST ALARM') || uName.includes('GHOSTALARM')) {
          continue;
        }

        if (uName.includes('FSK BASESTATION') || uName.includes('REPEATER') || uName.includes('TEST BENCH') || ref === '00000' || ref === '01000') {
           let status = 'INTERNAL_NON_BILLABLE';
           let action = 'Auto-cleared: Internal Infrastructure';
           internalNonBillableCount++;
           const iRow = { rawRef: ref, clientName: name, customerNo: 'INTERNAL', detectedPort: portId, status, action };
           stagingRows.push(iRow);
           internal.push(iRow);
           continue;
        }

        // 2. Port Padding Normalization
        const standardPorts = ['02', '08', '11', '15', '2', '8'];
        if (standardPorts.includes(portId) && /^\d+$/.test(ref)) {
          ref = ref.padStart(11, '0');
        }

        let status = 'UNBILLED_PATRIOT';
        let action = 'Needs linking or billing setup';

        // 3. Unallocated Hardware Ingestion
        if (uName.includes('UNKNOWN') || uName.includes('WHO IS THIS')) {
           status = 'UNALLOCATED_HARDWARE';
           action = 'Unassigned physical transmitter';
           
           const hwClientNo = ref || portId;
           await prisma.unallocatedHardware.upsert({
             where: { client_no: hwClientNo },
             update: { port_id: portId, base_tx: portId },
             create: { client_no: hwClientNo, port_id: portId, base_tx: portId, ext_ref: name }
           });

           const uRow = { rawRef: ref, clientName: name, customerNo: ref, detectedPort: portId, status, action };
           stagingRows.push(uRow);
           unallocated.push(uRow);
           continue;
        }

        // 4. Strict Internal Equipment check by EXACT rawRef only
        const isInternalByRef = ref && internalRawRefSet.has(ref);
        const internalRecord = isInternalByRef
          ? internalEquipment.find(i => i.transmitter_no === ref)
          : null;

        if (isInternalByRef && internalRecord) {
          status = 'INTERNAL_NON_BILLABLE';
          action = `Auto-cleared: ${internalRecord.description}`;
          internalNonBillableCount++;

          const iRow = {
            rawRef: ref,
            clientName: `Internal: ${internalRecord.category}`,
            customerNo: 'INTERNAL',
            detectedPort: portId,
            status,
            action
          };
          stagingRows.push(iRow);
          internal.push(iRow);
          continue;
        }

        // 5. Multi-Pass Matching against Seeded Client Directory & Xero
        const raw_ref = ref;
        let base_tx = raw_ref;
        if (raw_ref && raw_ref.length >= 10 && raw_ref.length <= 12) {
            const portLen = 2;
            const rem = raw_ref.slice(0, -portLen);
            base_tx = rem.length >= 4 ? rem.slice(0, -4) : rem;
        }
        const ext_ref = extRef;
        const normalized_name = name.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\b(mr|mrs|ms|dr|prof)\b/g, '').trim();

        const matchedClient = clients.find(c => {
            const cRef = String(c.customer_no || '').trim();
            const cName = String(c.company_name || '').trim().toLowerCase();
            if (cRef === raw_ref || (base_tx && cRef === base_tx) || (ext_ref && cRef === ext_ref)) return true;
            if (normalized_name && cName === normalized_name) return true;
            return false;
        });

        const displayName = matchedClient
          ? (matchedClient.company_name || `${matchedClient.first_name || ''} ${matchedClient.surname || ''}`.trim())
          : name;
        const displayCustNo = matchedClient ? matchedClient.customer_no : ref;

        // Xero Lookup
        const isBilledInXero = xeroData.some(x => {
            const xRef = String(x['Reference'] || x['AccountCode'] || x['InvoiceNumber'] || '').trim();
            const xName = String(x['*ContactName'] || x['ContactName'] || x['Contact Name'] || x['Client Name'] || x['Name'] || '').trim().toLowerCase();
            const xNameNorm = xName.replace(/[^a-z0-9 ]/g, '');
            if (base_tx && (xRef.includes(base_tx) || xName.includes(base_tx))) return true;
            if (normalized_name && normalized_name.length > 3 && (xNameNorm === normalized_name || xNameNorm.includes(normalized_name))) return true;
            return false;
        });

        if (isBilledInXero) {
            if (!matchedBaseTxSet.has(base_tx)) {
                matchedBaseTxSet.add(base_tx);
                status = 'MATCHED_BILLED';
                action = 'Matches active primary and is billed in Xero';
                matchedAndBilled++;
                const r = { rawRef: ref, clientName: displayName, customerNo: displayCustNo, detectedPort: portId, status, action };
                stagingRows.push(r);
                reconciled.push(r);
            } else {
                status = 'COVERED_BY_PRIMARY';
                action = 'Linked as secondary/auxiliary to primary Xero invoice';
                coveredUnderPrimary++;
                const r = { rawRef: ref, clientName: displayName, customerNo: displayCustNo, detectedPort: portId, status, action };
                stagingRows.push(r);
                primary.push(r);
            }
        } else if (matchedClient && matchedClient.master_payer_id) {
            // Body Corporate logic
            const masterClient = clients.find(c => c.id === matchedClient.master_payer_id);
            let isMasterBilled = false;
            if (masterClient) {
                const mRef = String(masterClient.customer_no || '').trim();
                let mBase = mRef;
                if (mRef.length >= 10 && mRef.length <= 12) {
                    const mRem = mRef.slice(0, -2);
                    mBase = mRem.length >= 4 ? mRem.slice(0, -4) : mRem;
                }
                const mNameNorm = String(masterClient.company_name || '').trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
                
                isMasterBilled = xeroData.some(x => {
                    const xRef = String(x['Reference'] || x['AccountCode'] || x['InvoiceNumber'] || '').trim();
                    const xName = String(x['*ContactName'] || x['ContactName'] || x['Contact Name'] || x['Client Name'] || x['Name'] || '').trim().toLowerCase();
                    if (mBase && (xRef.includes(mBase) || xName.includes(mBase))) return true;
                    if (mNameNorm && mNameNorm.length > 3 && xName.replace(/[^a-z0-9 ]/g, '').includes(mNameNorm)) return true;
                    return false;
                });
            }

            if (isMasterBilled) {
                status = 'MATCHED_VIA_BODY_CORPORATE';
                action = 'Covered by Master Payer Xero Invoice';
                matchedViaBodyCorporate++;
                const r = { rawRef: ref, clientName: displayName, customerNo: displayCustNo, detectedPort: portId, status, action };
                stagingRows.push(r);
                bodyCorporate.push(r);
            } else {
                status = 'UNLINKED_COMMERCIAL_TENANT';
                action = 'Master payer missing from Xero';
                unlinkedCommercialTenant++;
                const r = { rawRef: ref, clientName: displayName, customerNo: displayCustNo, detectedPort: portId, status, action };
                stagingRows.push(r);
                unlinkedCommercial.push(r);
            }
        } else {
            let isSubPartition = false;
            if (raw_ref.length >= 10) {
               const partition = raw_ref.slice(5, 9);
               if (partition !== '0000') isSubPartition = true;
            }

            if (isSubPartition) {
                status = 'UNLINKED_COMMERCIAL_TENANT';
                action = 'Sub-partition without matching primary or individual invoice';
                unlinkedCommercialTenant++;
                const r = { rawRef: ref, clientName: displayName, customerNo: displayCustNo, detectedPort: portId, status, action };
                stagingRows.push(r);
                unlinkedCommercial.push(r);
            } else {
                let swapDetected = false;
                if (normalized_name.length > 3) {
                    const dbMatch = clients.find(c => c.company_name?.toLowerCase().includes(normalized_name) || c.surname?.toLowerCase().includes(normalized_name));
                    if (dbMatch) swapDetected = true;
                }
                if (swapDetected) {
                    status = 'RADIO_SWAP';
                    action = 'Found unlinked hardware for this client';
                    radioSwapsDetected++;
                    const r = { rawRef: ref, clientName: displayName, customerNo: displayCustNo, detectedPort: portId, status, action };
                    stagingRows.push(r);
                    radioSwaps.push(r);
                } else {
                    status = 'UNBILLED_PATRIOT';
                    action = 'Missing from billing exports';
                    unbilledPatriot++;
                    const r = { rawRef: ref, clientName: displayName, customerNo: displayCustNo, detectedPort: portId, status, action };
                    stagingRows.push(r);
                    unbilled.push(r);
                }
            }
        }
      } catch (rowErr) {
        console.error('Error processing row in Patriot data:', row, rowErr);
      }
    }

    // 2. Billing Checks & Mandates
    for (const client of clients) {
      let isBilled = false;

      const xeroMatch = xeroData.find(row => 
        (String(row['Reference'] || '').trim() === client.customer_no || String(row['ContactName'] || '').trim().includes(client.surname || ''))
      );
      if (xeroMatch) isBilled = true;

      const netcashMatch = netcashData.find(row => 
        (String(row['Reference'] || '').trim() === client.customer_no || String(row['AccountName'] || '').trim().includes(client.surname || ''))
      );
      if (netcashMatch) {
        isBilled = true;
      } else if (client.payment_method === 'DEBIT_ORDER_NETCASH') {
        missingNetcashMandates++;
      }

      if (isBilled) matchedAndBilled++;
    }

    // 3. Port 11 Xero Auto-Matching Algorithm
    const port11Clients = await prisma.client.findMany({
      where: {
        is_active: true,
        is_reconciled: false,
        sites: {
          some: {
            transmitters: {
              some: { port_id: '11', status: 'ACTIVE' }
            }
          }
        }
      },
      include: {
        sites: { include: { transmitters: true } }
      }
    });

    const xeroMatches: any[] = [];
    const totalXeroAccounts = xeroData.length;
    const lockedXeroAccounts = await prisma.client.count({ where: { is_reconciled: true, xero_contact_id: { not: null } } });
    
    // Batch lookup for already locked xero contacts
    const lockedContacts = await prisma.client.findMany({
      where: { is_reconciled: true, xero_contact_id: { not: null } },
      select: { xero_contact_id: true }
    });
    const lockedContactIds = new Set(lockedContacts.map(c => c.xero_contact_id));

    for (const row of xeroData) {
      const xeroContactId = String(row['ContactID'] || '').trim();
      const xeroRef = String(row['Reference'] || row['AccountCode'] || row['InvoiceNumber'] || '').trim();
      const xeroNameRaw = String(row['*ContactName'] || row['ContactName'] || row['Contact Name'] || row['Client Name'] || row['Name'] || '').trim();
      
      if (!xeroContactId || (!xeroRef && !xeroNameRaw)) continue;

      // Skip already reconciled clients based on xero_contact_id
      if (lockedContactIds.has(xeroContactId)) continue;

      let matchedClient = null;
      let matchConfidence = '';
      let badgeLabel = '';

      const xeroNameNorm = xeroNameRaw.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Check Tier 1
      matchedClient = port11Clients.find(c => {
         let isInternalOrZero = false;
         let hasExactRefMatch = false;

         for (const s of c.sites) {
            for (const t of s.transmitters) {
               if (t.port_id === '11') {
                   const raw = t.transmitter_no.replace(/\D/g, '');
                   
                   // 1. Exclude Internal Equipment
                   if (internalRawRefSet.has(t.transmitter_no) || raw === '00000' || raw === '01000' || t.transmitter_no === '00000' || t.transmitter_no === '01000') {
                       isInternalOrZero = true;
                   }

                   let base_tx = raw;
                   if (raw.endsWith('11') && raw.length > 2) {
                      base_tx = raw.slice(0, -2);
                   }
                   if (base_tx === xeroRef || raw === xeroRef) {
                      hasExactRefMatch = true;
                   }
               }
            }
         }

         if (isInternalOrZero) return false;

         if (hasExactRefMatch || c.customer_no === xeroRef || c.agreement_ref_number === xeroRef) {
             badgeLabel = '100% Exact Ref';
             return true;
         }

         const cSurname = (c.surname || '').toLowerCase().replace(/[^a-z0-9]/g, '');
         const cInitial = (c.first_name || '').charAt(0).toLowerCase();
         const combo1 = cSurname + cInitial;
         const combo2 = cInitial + cSurname;
         
         if (xeroNameNorm.length >= 3) {
             if ((combo1.length >= 3 && xeroNameNorm === combo1) || (combo2.length >= 3 && xeroNameNorm === combo2)) {
                 badgeLabel = '100% Exact Name';
                 return true;
             }
         }
         return false;
      });

      if (matchedClient) {
         matchConfidence = 'MATCHED_BILLED';
      } else {
         // Tier 2: Fuzzy / Probable Match
         if (xeroNameNorm.length > 2) {
             let bestSim = 0;
             let bestMatch = null;

             for (const c of port11Clients) {
                 let isInternalOrZero = false;
                 for (const s of c.sites) {
                    for (const t of s.transmitters) {
                       if (t.port_id === '11') {
                           const raw = t.transmitter_no.replace(/\D/g, '');
                           if (internalRawRefSet.has(t.transmitter_no) || raw === '00000' || raw === '01000' || t.transmitter_no === '00000' || t.transmitter_no === '01000') {
                               isInternalOrZero = true;
                           }
                       }
                    }
                 }
                 if (isInternalOrZero) continue;

                 const cSurname = (c.surname || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                 const cFirstName = (c.first_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                 const cFullName = (cFirstName + cSurname);
                 
                 let maxSim = 0;
                 if (cSurname.length >= 3) {
                     const sim1 = stringSimilarity(xeroNameNorm, cSurname);
                     if (sim1 > maxSim) maxSim = sim1;
                 }
                 if (cFullName.length >= 3) {
                     const sim2 = stringSimilarity(xeroNameNorm, cFullName);
                     if (sim2 > maxSim) maxSim = sim2;
                     const sim3 = stringSimilarity(xeroNameNorm, cSurname + cFirstName);
                     if (sim3 > maxSim) maxSim = sim3;
                 }
                 if (c.company_name && c.company_name.length >= 3) {
                     const cComp = c.company_name.toLowerCase().replace(/[^a-z0-9]/g, '');
                     const sim4 = stringSimilarity(xeroNameNorm, cComp);
                     if (sim4 > maxSim) maxSim = sim4;
                 }

                 if (maxSim > bestSim && maxSim > 0.8) {
                     bestSim = maxSim;
                     bestMatch = c;
                 }
             }

             if (bestMatch) {
                matchedClient = bestMatch;
                matchConfidence = 'SUGGESTED_MATCH';
                badgeLabel = `${Math.round(bestSim * 100)}% Name Match`;
             }
         }
      }

      if (matchedClient) {
         xeroMatches.push({
            xero_contact_id: xeroContactId,
            xero_reference: xeroRef,
            xero_name: xeroNameRaw,
            client_id: matchedClient.id,
            client_name: matchedClient.company_name || `${matchedClient.first_name || ''} ${matchedClient.surname || ''}`.trim(),
            client_no: matchedClient.customer_no,
            match_confidence: matchConfidence,
            badge_label: badgeLabel
         });
      } else {
         xeroMatches.push({
            xero_contact_id: xeroContactId,
            xero_reference: xeroRef,
            xero_name: xeroNameRaw,
            match_confidence: 'UNBILLED_PATRIOT'
         });
      }
    }

    res.json({
      matched_and_billed: matchedAndBilled,
      unbilled_patriot: unbilledPatriot,
      missing_netcash_mandates: missingNetcashMandates,
      radio_swaps_detected: radioSwapsDetected,
      covered_under_primary: coveredUnderPrimary,
      internal_non_billable: internalNonBillableCount,
      matched_via_body_corporate: matchedViaBodyCorporate,
      unlinked_commercial_tenant: unlinkedCommercialTenant,
      seededClientCount,
      staging_rows: stagingRows,
      // Clean decoupled arrays per status
      reconciled,
      unbilled,
      primary,
      radioSwaps,
      internal,
      unallocated,
      bodyCorporate,
      unlinkedCommercial,
      xero_matches: xeroMatches,
      xero_total: totalXeroAccounts,
      xero_locked: lockedXeroAccounts
    });

  } catch (error: any) {
    console.error('Error during reconciliation parse:', error);
    res.status(400).json({ error: error.message || 'Failed to process reconciliation files' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/reconciliation/link-secondary
// ---------------------------------------------------------------------------
router.post('/link-secondary', async (req: Request, res: Response) => {
  try {
    const { patriot_transmitter_no, patriot_port, target_client_id } = req.body;
    if (!target_client_id || !patriot_port) {
      return res.status(400).json({ error: 'Missing target_client_id or patriot_port' });
    }

    const client = await prisma.client.findUnique({
      where: { id: parseInt(target_client_id.toString()) },
      include: { sites: true }
    });

    if (!client || client.sites.length === 0) {
      return res.status(404).json({ error: 'Client or primary site not found' });
    }

    const primarySiteId = client.sites[0].id;

    const newTransmitter = await prisma.siteTransmitter.create({
      data: {
        site_id: primarySiteId,
        role: 'SECONDARY',
        transmitter_no: patriot_transmitter_no || patriot_port,
        port_id: patriot_port,
        status: 'ACTIVE',
        assigned_at: new Date()
      }
    });

    res.json({ success: true, transmitter: newTransmitter });
  } catch (error) {
    console.error('Error linking secondary transmitter:', error);
    res.status(500).json({ error: 'Failed to link secondary transmitter' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reconciliation/internal-equipment
// ---------------------------------------------------------------------------
router.get('/internal-equipment', async (req: Request, res: Response) => {
  try {
    const equipment = await prisma.internalEquipment.findMany({
      orderBy: { created_at: 'desc' }
    });
    res.json(equipment);
  } catch (error) {
    console.error('Error fetching internal equipment:', error);
    res.status(500).json({ error: 'Failed to fetch internal equipment' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/reconciliation/internal-equipment
// ---------------------------------------------------------------------------
router.post('/internal-equipment', async (req: Request, res: Response) => {
  try {
    const { transmitter_no, port_id, description, location, category } = req.body;
    if (!transmitter_no || !description || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newItem = await prisma.internalEquipment.create({
      data: { transmitter_no, port_id, description, location, category }
    });
    res.json({ success: true, equipment: newItem });
  } catch (error) {
    console.error('Error creating internal equipment:', error);
    res.status(500).json({ error: 'Failed to create internal equipment' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/reconciliation/internal-equipment/:id
// ---------------------------------------------------------------------------
router.delete('/internal-equipment/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.internalEquipment.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting internal equipment:', error);
    res.status(500).json({ error: 'Failed to delete internal equipment' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/reconciliation/reset-internal
// Hard-deletes ALL InternalEquipment AND clears orphan UnallocatedHardware
// ---------------------------------------------------------------------------
router.post('/reset-internal', async (req: Request, res: Response) => {
  try {
    const [deletedInternal, deletedHardware] = await Promise.all([
      prisma.internalEquipment.deleteMany({}),
      prisma.unallocatedHardware.deleteMany({})
    ]);
    console.log(`Reset: deleted ${deletedInternal.count} internal equipment, ${deletedHardware.count} unallocated hardware records.`);
    res.json({ success: true, deletedInternal: deletedInternal.count, deletedHardware: deletedHardware.count });
  } catch (error) {
    console.error('Error resetting internal equipment:', error);
    res.status(500).json({ error: 'Failed to reset internal equipment' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/reconciliation/unmark-internal
// Removes exact rawRef from InternalEquipment by transmitter_no
// ---------------------------------------------------------------------------
router.post('/unmark-internal', async (req: Request, res: Response) => {
  try {
    const { transmitter_no } = req.body;
    if (!transmitter_no) return res.status(400).json({ error: 'Missing transmitter_no' });

    await prisma.internalEquipment.deleteMany({
      where: { transmitter_no }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error unmarking internal equipment:', error);
    res.status(500).json({ error: 'Failed to unmark internal equipment' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reconciliation/unallocated-hardware
// ---------------------------------------------------------------------------
router.get('/unallocated-hardware', async (req: Request, res: Response) => {
  try {
    const hw = await prisma.unallocatedHardware.findMany({
      where: { status: 'UNALLOCATED' },
      orderBy: { created_at: 'desc' }
    });
    res.json(hw);
  } catch (error) {
    console.error('Error fetching unallocated hardware:', error);
    res.status(500).json({ error: 'Failed to fetch unallocated hardware' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/reconciliation/partition-split-bill
// ---------------------------------------------------------------------------
router.post('/partition-split-bill', async (req: Request, res: Response) => {
  try {
    const { transmitter_id, partition_no, label, billed_client_id, monthly_fee } = req.body;
    if (!transmitter_id || !partition_no || !billed_client_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const partition = await prisma.siteTransmitterPartition.create({
      data: {
        transmitter_id: parseInt(transmitter_id.toString()),
        partition_no,
        label,
        billed_client_id: parseInt(billed_client_id.toString()),
        is_billable: true,
        monthly_fee: monthly_fee ? parseFloat(monthly_fee.toString()) : 0
      }
    });

    res.json({ success: true, partition });
  } catch (error) {
    console.error('Error split billing partition:', error);
    res.status(500).json({ error: 'Failed to split bill partition' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/reconciliation/lock-matches
// ---------------------------------------------------------------------------
router.post('/lock-matches', async (req: Request, res: Response) => {
  try {
    const { matches } = req.body;
    if (!matches || !Array.isArray(matches)) {
      return res.status(400).json({ error: 'Missing or invalid matches array' });
    }

    let lockedCount = 0;
    for (const match of matches) {
      if (match.client_id && match.xero_contact_id) {
        await prisma.client.update({
          where: { id: parseInt(match.client_id.toString()) },
          data: {
            xero_contact_id: match.xero_contact_id,
            xero_reference: match.xero_reference || '',
            is_reconciled: true
          }
        });
        lockedCount++;
      }
    }

    res.json({ success: true, lockedCount });
  } catch (error) {
    console.error('Error locking matches:', error);
    res.status(500).json({ error: 'Failed to lock matches' });
  }
});

export default router;
