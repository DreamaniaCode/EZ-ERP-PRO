import { prisma } from '../prisma';
import { computeSynchronizedStocks } from '../../src/utils/stockReconciler';

async function main() {
  const products = await prisma.product.findMany();
  const frigos = await prisma.coldStorageFrigo.findMany();
  const stocks = await prisma.frigoStockLevel.findMany();
  const rawPurchases = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "purchase_invoices"`);
  const purchases = rawPurchases.map(p => ({
    ...p,
    items: typeof p.items === 'string' ? JSON.parse(p.items) : p.items,
    payments: typeof p.payments === 'string' ? JSON.parse(p.payments) : p.payments
  }));
  const rawBls = await prisma.deliveryNoteBL.findMany();
  const deliveryNotes = rawBls.map(b => ({
    ...b,
    items: typeof b.items === 'string' ? JSON.parse(b.items as any) : b.items,
    logs: typeof b.logs === 'string' ? JSON.parse(b.logs as any) : b.logs
  }));
  const rawMovements = await prisma.productStockMovement.findMany();
  const stockMovements = rawMovements.map(m => ({ ...m }));

  const result = computeSynchronizedStocks({
    products: products as any,
    frigos: frigos as any,
    stocks: stocks as any,
    purchaseInvoices: purchases as any,
    deliveryNotes: deliveryNotes as any,
    stockMovements: stockMovements as any,
    selectedFrigoId: 'ALL'
  });

  console.log('--- SYNCHRONIZED STOCKS BREAKDOWN ---');
  for (const p of result.productStocks) {
    const activeBreakdown = p.frigoBreakdown.filter(fb => fb.quantityKg > 0);
    if (activeBreakdown.length > 0) {
      console.log(`\nProduct: [${p.productCode}] "${p.productName}" (Total: ${p.totalStockKg} kg)`);
      activeBreakdown.forEach(fb => {
        console.log(`  -> Frigo: [${fb.frigoId}] "${fb.frigoName}" | Qty: ${fb.quantityKg} kg (${fb.quantityPallets} pal) | Entries: ${fb.entriesKg} kg | Exits: ${fb.exitsKg} kg`);
      });
    }
  }
}

main().finally(() => prisma.$disconnect());
