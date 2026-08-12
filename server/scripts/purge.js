const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function purge() {
  console.log('Purging unallocated hardware...');
  await prisma.unallocatedHardware.deleteMany({});
  
  console.log('Purging staging results...');
  try { await prisma.stagingResult.deleteMany({}); } catch (e) { console.log('StagingResult table probably not found, skipping'); }
  
  console.log('Purging internal equipment...');
  await prisma.internalEquipment.deleteMany({});
  
  console.log('Purge complete.');
}

purge().catch(console.error).finally(() => prisma.$disconnect());
