import { prisma } from '../prisma';

async function main() {
  console.log('Resetting virtual stocks in secondary frigos (frigo-2, frigo-3) to 0...');

  await prisma.frigoStockLevel.updateMany({
    where: {
      frigoId: { in: ['frigo-2', 'frigo-3'] }
    },
    data: {
      quantityKg: 0,
      quantityPallets: 0,
    }
  });

  const updatedStocks = await prisma.frigoStockLevel.findMany();
  console.log('Updated stocks in PostgreSQL:', updatedStocks.map(s => ({
    frigoId: s.frigoId,
    productId: s.productId,
    quantityKg: s.quantityKg,
    quantityPallets: s.quantityPallets
  })));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
