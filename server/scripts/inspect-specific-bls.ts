import { prisma } from '../prisma';

async function main() {
  const bl1 = await prisma.deliveryNoteBL.findFirst({ where: { blNumber: 'BL-MLHMD-2026-4368' } });
  const bl2 = await prisma.deliveryNoteBL.findFirst({ where: { blNumber: 'BL-MLHMD-2026-2330' } });

  console.log('BL 1 (lhssen rachidiya):', JSON.stringify(bl1, null, 2));
  console.log('BL 2 (rachid laarayche):', JSON.stringify(bl2, null, 2));
}

main().finally(() => prisma.$disconnect());
