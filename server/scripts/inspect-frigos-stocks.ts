import { prisma } from '../prisma';

async function main() {
  const frigos = await prisma.coldStorageFrigo.findMany();
  console.log('--- FRIGOS ---');
  frigos.forEach(f => console.log(`[${f.id}] code: "${f.code}", name: "${f.name}"`));

  const stocks = await prisma.frigoStockLevel.findMany();
  console.log(`\n--- FRIGO STOCK LEVELS in DB (${stocks.length} records) ---`);
  stocks.filter(s => s.quantityKg > 0).forEach(s => {
    console.log(` - FrigoId: ${s.frigoId}, ProductId: ${s.productId}, ${s.quantityKg} Kg, ${s.quantityPallets} pal`);
  });
}

main().finally(() => prisma.$disconnect());
