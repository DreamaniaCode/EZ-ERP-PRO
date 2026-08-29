import { prisma } from '../prisma';

async function main() {
  console.log('Fixing database schema for purchase_invoices...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "purchase_invoices" 
    ADD COLUMN IF NOT EXISTS "timeArrival" TEXT DEFAULT ''
  `);
  console.log('✅ Column "timeArrival" added/verified in purchase_invoices table!');

  // Also verify any other missing columns across all tables
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "notes" TEXT DEFAULT '';
    ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "notes" TEXT DEFAULT '';
  `);

  const purchases = await prisma.purchaseImportInvoice.findMany({ orderBy: { dateArrival: 'desc' } });
  console.log(`\n🎉 SUCCESS! prisma.purchaseImportInvoice.findMany() returned ${purchases.length} invoices:`);
  purchases.forEach(p => console.log(` - [${p.invoiceNumber}] ${p.supplierName} (${p.dateArrival}) - TargetFrigo: ${p.targetFrigoId}`));
}

main()
  .catch(e => console.error('Error fixing column:', e))
  .finally(() => prisma.$disconnect());
