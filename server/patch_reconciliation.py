import re

with open(r'c:\Projects\SAFE-CRM\server\src\routes\reconciliation.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace variables
new_vars = """    let matchedAndBilled = 0;
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

    const matchedBaseTxSet = new Set<string>();"""

content = re.sub(
    r'    let matchedAndBilled = 0;.*?let stagingRows: any\[\] = \[\];',
    new_vars,
    content,
    flags=re.DOTALL
)

# Replace patriotData loop
new_loop = """    // 1. Detect Swaps & Discrepancies from Patriot Data
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
        if (standardPorts.includes(portId) && /^\\d+$/.test(ref)) {
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
        const normalized_name = name.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\\b(mr|mrs|ms|dr|prof)\\b/g, '').trim();

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
    }"""

content = re.sub(
    r'    // 1\. Detect Swaps & Discrepancies from Patriot Data.*?      } catch \(rowErr\) \{\n        console\.error\(\'Error processing row in Patriot data:\', row, rowErr\);\n      \}\n    \}',
    new_loop.replace('\\', '\\\\'),
    content,
    flags=re.DOTALL
)

# Replace return output
new_return = """    res.json({
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
    });"""

content = re.sub(
    r'    res\.json\(\{\n      matched_and_billed: matchedAndBilled.*?    \}\);',
    new_return,
    content,
    flags=re.DOTALL
)

with open(r'c:\Projects\SAFE-CRM\server\src\routes\reconciliation.ts', 'w', encoding='utf-8') as f:
    f.write(content)
