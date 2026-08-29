import { prisma } from '../prisma';

async function main() {
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: 'khalid', mode: 'insensitive' } },
        { name: { contains: 'libi', mode: 'insensitive' } },
        { companyName: { contains: 'khalid', mode: 'insensitive' } },
        { companyName: { contains: 'libi', mode: 'insensitive' } },
      ]
    }
  });
  console.log('--- CLIENTS MATCHING KHALID / LIBI ---');
  console.log(clients);

  const bls = await prisma.deliveryNoteBL.findMany({
    where: {
      OR: [
        { clientName: { contains: 'khalid', mode: 'insensitive' } },
        { clientName: { contains: 'libi', mode: 'insensitive' } },
      ]
    }
  });
  console.log(`\n--- BLs MATCHING KHALID / LIBI (${bls.length} found) ---`);
  bls.forEach(b => console.log(` - [${b.blNumber}] Date: ${b.date} | Client: "${b.clientName}" | TotalKg: ${b.totalKg} | TotalHT: ${b.totalHT} DH`));

  const allBLs = await prisma.deliveryNoteBL.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
  console.log(`\n--- 10 MOST RECENT BLs IN DB ---`);
  allBLs.forEach(b => console.log(` - [${b.blNumber}] CreatedAt: ${b.createdAt} | Client: "${b.clientName}" (${b.clientId}) | ${b.totalKg} kg`));
}

main().finally(() => prisma.$disconnect());
