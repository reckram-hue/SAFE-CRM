const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const towns = await prisma.town.findMany();
  console.log(towns);
}
main().finally(() => prisma.$disconnect());
