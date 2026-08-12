const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const suburbs = await prisma.suburb.findMany();
  console.log(suburbs);
}
main().finally(() => prisma.$disconnect());
