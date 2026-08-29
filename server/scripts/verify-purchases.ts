import { prisma } from '../prisma';

async function main() {
  console.log('Verifying purchase_invoices query...');
  const purchases = await prisma.purchaseImportInvoice.findMany({ orderBy: { dateArrival: 'desc' } });
  console.log(`\n🎉 SUCCESS! prisma.purchaseImportInvoice.findMany() returned ${purchases.length} invoices:`);
  purchases.forEach(p => {
    const items = typeof p.items === 'string' ? JSON.parse(p.items as any) : p.items;
    const totalKg = (items || []).reduce((sum: number, it: any) => sum + (Number(it.quantityKg) || 0), 0);
    console.log(` - [${p.invoiceNumber}] Fournisseur: "${p.supplierName}" | Date: ${p.dateArrival} | Frigo: ${p.targetFrigoId} | Total: ${totalKg} Kg | Landed Cost: ${p.totalLandedCostHT} DH`);
  });
}

main()
  .catch(e => console.error('Error querying purchases:', e))
  .finally(() => prisma.$disconnect());
