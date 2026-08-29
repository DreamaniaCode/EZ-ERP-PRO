import { prisma } from '../prisma';

async function main() {
  const khalidBLs = await prisma.deliveryNoteBL.findMany({
    where: { clientName: { contains: 'Khalid Libi', mode: 'insensitive' } },
    orderBy: { date: 'asc' }
  });
  console.log(`\n--- BLs FOR KHALID LIBI (${khalidBLs.length} found) ---`);
  let totalKg = 0;
  khalidBLs.forEach(b => {
    totalKg += b.totalKg;
    console.log(` - [${b.blNumber}] Date: ${b.date} | Produit: "${b.items[0]?.productName}" | Qte: ${b.totalKg} Kg (${b.totalCartons} colis) | Statut: ${b.status}`);
  });
  console.log(`\nTOTAL KHALID LIBI: ${totalKg} Kg across ${khalidBLs.length} BLs`);

  const otherBLs = await prisma.deliveryNoteBL.findMany({
    where: {
      OR: [
        { clientName: { contains: 'aymane libia', mode: 'insensitive' } },
        { blNumber: { in: ['BL-MLHMD-2026-0281', 'BL-MLHMD-2026-0296'] } },
      ]
    },
    orderBy: { date: 'asc' }
  });
  console.log(`\n--- OTHER RECONDITIONED BLs (${otherBLs.length} found) ---`);
  otherBLs.forEach(b => {
    console.log(` - [${b.blNumber}] Date: ${b.date} | Client: "${b.clientName}" | Qte: ${b.totalKg} Kg`);
  });
}

main().finally(() => prisma.$disconnect());
