import { prisma } from '../prisma';

async function main() {
  const purchases = await prisma.$queryRawUnsafe(`SELECT * FROM "purchase_invoices"`);
  console.log('--- RAW PURCHASE INVOICES ---', purchases);

  const movements = await prisma.productStockMovement.findMany();
  console.log('--- RAW MOVEMENTS in DB ---', movements.length);
  movements.forEach(m => {
    console.log(` - Frigo: ${m.frigoId} (${m.frigoName}), Product: ${m.productName}, Qty: ${m.quantityKg} kg, Type: ${m.type}, Ref: ${m.referenceDoc}`);
  });
}

main().finally(() => prisma.$disconnect());
