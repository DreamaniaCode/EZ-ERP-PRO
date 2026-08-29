import { prisma } from '../prisma';

async function main() {
  const purchases = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "purchase_invoices"`);
  for (const p of purchases) {
    console.log(`\n📦 Invoice: ${p.invoiceNumber} (ID: ${p.id}) | Frigo: ${p.targetFrigoId}`);
    const items = typeof p.items === 'string' ? JSON.parse(p.items) : p.items;
    for (const it of items || []) {
      console.log(`   - Product: [${it.productId}] "${it.productName}" | ${it.quantityKg} Kg`);
    }
  }
}

main().finally(() => prisma.$disconnect());
