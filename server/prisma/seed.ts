import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed (SQLite - Refinement Services)...');

  // 1. Towns
  const town = await prisma.town.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Hermanus',
      is_active: true,
    },
  });
  console.log(`Town configured: ${town.name}`);

  // 2. Suburbs
  const suburbs = [
    'Voëlklip',
    'Fernkloof',
    'Eastcliff',
    'Northcliff',
    'Westcliff',
    'Onrus',
    'Sandbaai',
    'Vermont',
  ];
  for (const [index, name] of suburbs.entries()) {
    await prisma.suburb.upsert({
      where: { id: index + 1 },
      update: {},
      create: {
        id: index + 1,
        name,
        is_active: true,
      },
    });
  }
  console.log(`Populated ${suburbs.length} suburbs.`);

  // 3. Sectors
  const sectors = ['Sector 1', 'Sector 2', 'Sector 3', 'Sector 4'];
  for (const [index, name] of sectors.entries()) {
    await prisma.sector.upsert({
      where: { id: index + 1 },
      update: {},
      create: {
        id: index + 1,
        name,
        is_active: true,
      },
    });
  }
  console.log(`Populated ${sectors.length} sectors.`);

  // 4. Estates
  const estates = ["XYZ Estate", "Mariner's Village", 'Hemel-en-Aarde Estate'];
  for (const [index, name] of estates.entries()) {
    await prisma.estate.upsert({
      where: { id: index + 1 },
      update: {},
      create: {
        id: index + 1,
        name,
        is_active: true,
      },
    });
  }
  console.log(`Populated ${estates.length} estates.`);

  // 5. Services (Refined list with Email reports, SMS notifications, Dahua/Ajax IP transmitter fees)
  const services = [
    { name: 'Armed Response & Monitoring', base_fee: 450.0, is_annual: false },
    { name: 'Business Open/Close', base_fee: 200.0, is_annual: false },
    { name: 'CCTV Camera 1 Base Fee', base_fee: 250.0, is_annual: false },
    { name: 'CCTV Additional Camera Fee', base_fee: 150.0, is_annual: false },
    { name: 'Annual RF Radio Network Fee', base_fee: 350.0, is_annual: true },
    { name: 'Annual GSM Network Fee', base_fee: 450.0, is_annual: true },
    { name: 'HYYP App Monthly Fee', base_fee: 50.0, is_annual: false },
    { name: 'OLARM App Monthly Fee', base_fee: 50.0, is_annual: false },
    { name: 'Email Report - Daily', base_fee: 50.0, is_annual: false },
    { name: 'Email Report - Weekly', base_fee: 30.0, is_annual: false },
    { name: 'Email Report - Monthly', base_fee: 20.0, is_annual: false },
    { name: 'SMS Notifications - Daily', base_fee: 50.0, is_annual: false },
    { name: 'SMS Notifications - Weekly', base_fee: 30.0, is_annual: false },
    { name: 'SMS Notifications - Monthly', base_fee: 20.0, is_annual: false },
    { name: 'Dahua IP Transmitter Fee', base_fee: 400.0, is_annual: true },
    { name: 'Ajax IP Transmitter Fee', base_fee: 450.0, is_annual: true },
  ];

  for (const [index, s] of services.entries()) {
    await prisma.service.upsert({
      where: { id: index + 1 },
      update: {
        name: s.name,
        base_fee: s.base_fee,
        is_annual: s.is_annual,
      },
      create: {
        id: index + 1,
        name: s.name,
        base_fee: s.base_fee,
        is_annual: s.is_annual,
        is_active: true,
      },
    });
  }
  console.log(`Populated ${services.length} services with refined tariffs.`);

  // 6. Alarm Makes & Models
  const alarmMakes = [
    { name: 'Paradox', models: ['MG5050', 'SP6000', 'EVO192'] },
    { name: 'IDS', models: ['805', '1632', 'X64'] },
    { name: 'Texecom', models: [] },
    { name: 'DSC', models: [] },
    { name: 'Hikvision', models: [] },
    { name: 'Dahua', models: [] }
  ];

  for (const [makeIndex, make] of alarmMakes.entries()) {
    const createdMake = await prisma.alarmMake.upsert({
      where: { id: makeIndex + 1 },
      update: { name: make.name },
      create: { id: makeIndex + 1, name: make.name, is_active: true }
    });

    for (const [modelIndex, modelName] of make.models.entries()) {
      // Create unique ID for each model based on make index (e.g. 101, 102...)
      const modelId = (makeIndex + 1) * 100 + modelIndex + 1;
      await prisma.alarmModel.upsert({
        where: { id: modelId },
        update: { name: modelName, makeId: createdMake.id },
        create: { id: modelId, name: modelName, makeId: createdMake.id, is_active: true }
      });
    }
  }
  console.log(`Populated ${alarmMakes.length} Alarm Makes and their Models.`);

  // 7. Zone Types
  const zoneTypes = [
    'Door Contact', 'PIR Motion Sensor', 'Outdoor Beam', 'Panic Button', 'Smoke Detector', 'Tamper', 'Gate/Fence'
  ];

  for (const [index, label] of zoneTypes.entries()) {
    await prisma.zoneType.upsert({
      where: { id: index + 1 },
      update: { label },
      create: { id: index + 1, label, is_active: true }
    });
  }
  console.log(`Populated ${zoneTypes.length} Zone Types.`);

  // 8. Billing Cycles
  const billingCycles = [
    'Monthly', 'Quarterly', 'Bi-Annually', 'Annually', '5-Year Advance'
  ];

  for (const [index, name] of billingCycles.entries()) {
    await prisma.billingCycle.upsert({
      where: { id: index + 1 },
      update: { name },
      create: { id: index + 1, name, is_active: true }
    });
  }
  console.log(`Populated ${billingCycles.length} Billing Cycles.`);

  // 9. Zone Descriptors
  const zoneDescriptors = [
    'Front Garden', 'Back Garden', 'North/South/East/West Perimeter', 'Perimeter Fence', 'Main Gate', 'Pedestrian Gate', 'Patio', 'Driveway', 'Courtyard',
    'Main Garage', 'Garage 1', 'Garage 2', 'Carport', 'Workshop', 'Tool Shed', 'Staff Quarters',
    'Front Door', 'Back Door', 'Kitchen Door', 'Patio Sliding Door', 'Scullery Door', 'Balcony Door', 'Side Access Gate',
    'Entrance Hall', 'Main Lounge', 'TV Room', 'Dining Room', 'Kitchen', 'Scullery', 'Passage', 'Upstairs Hallway', 'Study / Office',
    'Master Bedroom', 'Kids Bedroom 1', 'Kids Bedroom 2', 'Kids Bedroom 3', 'Guest Room 1', 'Guest Room 2', 'Safe Room / Panic Room',
    'Reception', 'Server Room', 'DB Room', 'Warehouse', 'Storeroom'
  ];

  for (const [index, label] of zoneDescriptors.entries()) {
    await prisma.zoneDescriptor.upsert({
      where: { label },
      update: { label },
      create: { label, is_active: true }
    });
  }
  console.log(`Populated ${zoneDescriptors.length} Zone Descriptors.`);

  // 10. Payment Methods
  const paymentMethods = [
    'Netcash Debit Order', 'EFT', 'Cash', 'Stop Order'
  ];

  for (const [index, name] of paymentMethods.entries()) {
    await prisma.paymentMethod.upsert({
      where: { name },
      update: { name },
      create: { name, is_active: true }
    });
  }
  console.log(`Populated ${paymentMethods.length} Payment Methods.`);

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
