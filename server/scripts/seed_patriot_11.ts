import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting DB Cleanup and Seeding...');

    // 1. Clear Stale Unallocated Hardware & Overrides
    await prisma.unallocatedHardware.deleteMany({});
    await prisma.internalEquipment.deleteMany({});
    
    await prisma.siteTransmitterPartition.deleteMany({});
    await prisma.siteTransmitter.deleteMany({});
    await prisma.site.deleteMany({});
    await prisma.client.deleteMany({});
    
    // Verify count
    const unallocatedCount = await prisma.unallocatedHardware.count();
    console.log(`Cleared unallocated hardware count: ${unallocatedCount}`);
    
    // 2. Locate Patriot Port 11 CSV
    const userProfile = process.env.USERPROFILE || '';
    const desktop = path.join(userProfile, 'Desktop', 'Patriot_Cleaned_Reports', 'Cleaned_Patriot_Port_11.csv');
    const onedrive = path.join(userProfile, 'OneDrive', 'Desktop', 'Patriot_Cleaned_Reports', 'Cleaned_Patriot_Port_11.csv');
    
    let csvPath = '';
    if (fs.existsSync(onedrive)) {
        csvPath = onedrive;
    } else if (fs.existsSync(desktop)) {
        csvPath = desktop;
    } else {
        console.error("Could not find Cleaned_Patriot_Port_11.csv in Desktop or OneDrive Desktop.");
        process.exit(1);
    }
    
    console.log(`Found file at: ${csvPath}`);
    
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    
    let seededCount = 0;
    
    // Process records
    for (const record of records as any[]) {
        const rawRef = record['Client_No'];
        let baseTx = record['Base_Transmitter_ID'];
        const portId = record['Port'];

        if (!baseTx) continue;
        
        // Strict 5-Digit Base Account Slicing for Port 11
        if (rawRef && rawRef.length >= 5) {
            baseTx = rawRef.substring(0, 5);
        } else {
            baseTx = rawRef;
        }
        // const extRef = record['External_Ref'];
        const clientName = record['Client_Name'];
        const partition = record['Partition']; 

        let clientType = 'BUSINESS';
        let billingCycle = null;
        
        const internalKeywords = ['FSK', 'Basestation', 'Base station', 'Repeater', 'Test Bench', 'Office'];
        const isInternal = internalKeywords.some(kw => clientName?.toLowerCase().includes(kw.toLowerCase()));
        
        if (isInternal) {
            clientType = 'INTERNAL_INFRASTRUCTURE';
            billingCycle = 'NON_BILLABLE';
        }

        // Ensure Client exists
        const client = await prisma.client.upsert({
            where: { customer_no: baseTx },
            update: {
                client_type: clientType,
                billing_cycle: billingCycle,
            },
            create: {
                customer_no: baseTx,
                agreement_ref_number: baseTx,
                client_type: clientType,
                billing_cycle: billingCycle,
                anniversary_month: 1,
                client_since: new Date(),
                payment_method: 'EFT',
                company_name: clientName,
                is_active: true
            }
        });
        
        // Ensure Site exists
        const siteName = `${clientName || 'Unknown'} - Main Site`;
        let site = await prisma.site.findFirst({
            where: { client_id: client.id }
        });
        if (!site) {
            site = await prisma.site.create({
                data: {
                    client_id: client.id,
                    site_name: siteName,
                    street_address: 'Unknown',
                }
            });
        }
        
        // Ensure Primary Transmitter exists
        let transmitter = await prisma.siteTransmitter.findFirst({
            where: {
                site_id: site.id,
                transmitter_no: baseTx,
            }
        });
        
        if (!transmitter) {
            transmitter = await prisma.siteTransmitter.create({
                data: {
                    site_id: site.id,
                    role: 'PRIMARY',
                    transmitter_no: baseTx,
                    port_id: portId,
                    status: 'ACTIVE'
                }
            });
        }
        
        // Add partition if it has one (including host partition 0000)
        if (partition) {
             const existingPartition = await prisma.siteTransmitterPartition.findFirst({
                 where: {
                     transmitter_id: transmitter.id,
                     partition_no: partition
                 }
             });
             
             if (!existingPartition) {
                 await prisma.siteTransmitterPartition.create({
                     data: {
                         transmitter_id: transmitter.id,
                         partition_no: partition,
                         label: clientName,
                         is_billable: false,
                     }
                 });
             }
        }
        
        seededCount++;
    }
    
    const totalUniqueClients = await prisma.client.count();
    const account21Count = await prisma.client.count({ where: { customer_no: '21' } });
    
    console.log(`Total Patriot Port 11 transmitter records seeded into DB: ${seededCount}`);
    console.log(`Total unique Client master records created: ${totalUniqueClients}`);
    console.log(`Remaining accounts with exact ID '21': ${account21Count}`);
}

main()
  .catch(e => {
      console.error(e);
      process.exit(1);
  })
  .finally(async () => {
      await prisma.$disconnect();
  });
