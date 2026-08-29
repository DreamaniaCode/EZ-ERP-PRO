import { prisma } from '../prisma';

interface RawBLRow {
  date: string; // DD/MM/YYYY
  productName: string;
  quantityKg: number;
  clientName: string;
}

const rawData: RawBLRow[] = [
  { date: '15/06/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 300, clientName: 'Khalid Libi' },
  { date: '16/06/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 654, clientName: 'Khalid Libi' },
  { date: '19/06/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 300, clientName: 'RACHID LAROUSSI' },
  { date: '20/06/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 210, clientName: 'Khalid Libi' },
  { date: '23/06/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 102, clientName: 'Khalid Libi' },
  { date: '24/06/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 102, clientName: 'Khalid Libi' },
  { date: '24/06/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 9, clientName: 'aymane libia' },
  { date: '25/06/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 402, clientName: 'Khalid Libi' },
  { date: '26/06/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 555, clientName: 'Khalid Libi' },
  { date: '26/06/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 6, clientName: 'aymane libia' },
  { date: '27/06/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 75, clientName: 'Khalid Libi' },
  { date: '29/06/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 3, clientName: 'aymane libia' },
  { date: '30/06/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 552, clientName: 'Khalid Libi' },
  { date: '01/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 48, clientName: 'Khalid Libi' },
  { date: '02/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 30, clientName: 'Khalid Libi' },
  { date: '03/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 75, clientName: 'Khalid Libi' },
  { date: '03/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 300, clientName: 'Khalid Libi' },
  { date: '04/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 3, clientName: 'rachid laarayche' },
  { date: '07/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 108, clientName: 'Khalid Libi' },
  { date: '08/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 126, clientName: 'Khalid Libi' },
  { date: '10/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 192, clientName: 'Khalid Libi' },
  { date: '10/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 81, clientName: 'Khalid Libi' },
  { date: '11/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 120, clientName: 'Khalid Libi' },
  { date: '13/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 252, clientName: 'Khalid Libi' },
  { date: '13/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 300, clientName: 'Khalid Libi' },
  { date: '14/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 258, clientName: 'Khalid Libi' },
  { date: '16/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 105, clientName: 'Khalid Libi' },
  { date: '17/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 285, clientName: 'Khalid Libi' },
  { date: '17/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 426, clientName: 'Khalid Libi' },
  { date: '21/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 228, clientName: 'Khalid Libi' },
  { date: '22/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 225, clientName: 'Khalid Libi' },
  { date: '23/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 102, clientName: 'Khalid Libi' },
  { date: '24/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 90, clientName: 'Khalid Libi' },
  { date: '27/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 600, clientName: 'Khalid Libi' },
  { date: '27/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 150, clientName: 'Khalid Libi' },
  { date: '28/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 195, clientName: 'Khalid Libi' },
  { date: '31/07/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 309, clientName: 'Khalid Libi' },
  { date: '03/08/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 90, clientName: 'Khalid Libi' },
  { date: '04/08/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 105, clientName: 'Khalid Libi' },
  { date: '06/08/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 105, clientName: 'Khalid Libi' },
  { date: '08/08/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 150, clientName: 'Khalid Libi' },
  { date: '10/08/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 300, clientName: 'Khalid Libi' },
  { date: '11/08/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 150, clientName: 'Khalid Libi' },
  { date: '17/08/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 108, clientName: 'Khalid Libi' },
  { date: '21/08/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 210, clientName: 'Khalid Libi' },
  { date: '22/08/2026', productName: 'ar sahar 3kg mlhmd', quantityKg: 51, clientName: 'Khalid Libi' },
];

async function main() {
  console.log(`Processing ${rawData.length} delivery notes and product reconditioning...`);

  const frigoZahi = await prisma.coldStorageFrigo.findFirst({
    where: { OR: [{ id: 'frigo-1787768385774' }, { name: { contains: 'Zahi', mode: 'insensitive' } }] }
  });
  if (!frigoZahi) throw new Error('Frigo Zahi introuvable');

  const sourceProduct = await prisma.product.findFirst({
    where: { OR: [{ id: 'prd-1787776721121' }, { code: 'PRD-DAT-018' }, { name: { contains: '12KG', mode: 'insensitive' } }] }
  });
  if (!sourceProduct) throw new Error('Produit Datte 12KG introuvable');

  let targetProduct = await prisma.product.findFirst({
    where: { OR: [{ id: 'prd-1787769114360' }, { code: 'PRD-DAT-008' }, { name: { contains: 'Arrousse sahara 3kg', mode: 'insensitive' } }] }
  });

  if (!targetProduct) {
    targetProduct = await prisma.product.create({
      data: {
        id: 'prd-1787769114360',
        code: 'PRD-DAT-008',
        name: 'Arrousse sahara 3kg mlhmd',
        category: 'Dattes Locales',
        origin: 'Sahara',
        sellingPriceHT: 0,
        unitCostHT: 0,
        vatRate: 0.20,
        kgPerCarton: 3,
        cartonsPerPallet: 100,
        kgPerPallet: 300,
        minStockAlertKg: 500,
        description: 'Produit issu du reconditionnement de Datte 12KG en format 3KG',
      }
    });
  }

  // Calculate total reconditioned KG
  const totalReconditionedKg = rawData.reduce((sum, r) => sum + r.quantityKg, 0);
  console.log(`Total KG to recondition & deliver: ${totalReconditionedKg} Kg (${totalReconditionedKg / 3} cartons de 3kg)`);

  // Ensure clients exist
  const clientsMap = new Map<string, any>();
  const allClients = await prisma.client.findMany();
  allClients.forEach(c => {
    clientsMap.set(c.name.trim().toLowerCase(), c);
    clientsMap.set(c.companyName.trim().toLowerCase(), c);
  });

  let maxClientNum = 47;
  allClients.forEach(c => {
    const match = (c.code || '').match(/CLT-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxClientNum) maxClientNum = num;
    }
  });

  // Helper to get or create client
  const getOrCreateClient = async (name: string) => {
    const clean = name.trim().toLowerCase();
    if (clientsMap.has(clean)) return clientsMap.get(clean);

    // Check partial matches
    for (const [k, c] of clientsMap.entries()) {
      if (k.includes(clean) || clean.includes(k)) return c;
    }

    maxClientNum++;
    const code = `CLT-${String(maxClientNum).padStart(3, '0')}`;
    const created = await prisma.client.create({
      data: {
        code,
        name: name.trim(),
        companyName: name.trim(),
        city: 'Casablanca',
        creditLimit: 300000,
        currentBalance: 0,
      }
    });
    clientsMap.set(clean, created);
    return created;
  };

  // Find max sequential number for MLHMD BLs
  const existingBLs = await prisma.deliveryNoteBL.findMany({ select: { blNumber: true } });
  let maxSeq = 279;
  existingBLs.forEach(b => {
    const m = (b.blNumber || '').match(/BL-MLHMD-2026-(\d+)/i);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  });

  // Delete previous test single BL if needed
  await prisma.deliveryNoteBL.deleteMany({
    where: { blNumber: 'BL-MLHMD-2026-0279' }
  });

  // Create reconditioning stock movements in Zahi
  await prisma.productStockMovement.create({
    data: {
      productId: sourceProduct.id,
      productName: sourceProduct.name,
      productCode: sourceProduct.code,
      frigoId: frigoZahi.id,
      frigoName: frigoZahi.name,
      type: 'SORTIE',
      quantityKg: totalReconditionedKg,
      quantityPallets: Math.ceil(totalReconditionedKg / (sourceProduct.kgPerPallet || 500)),
      performedBy: 'Reconditionnement',
      referenceDoc: 'RECOND-2026-12KG-3KG',
      notes: `Reconditionnement de ${totalReconditionedKg} Kg de ${sourceProduct.name} en ${targetProduct.name} (3kg)`,
    }
  });

  await prisma.productStockMovement.create({
    data: {
      productId: targetProduct.id,
      productName: targetProduct.name,
      productCode: targetProduct.code,
      frigoId: frigoZahi.id,
      frigoName: frigoZahi.name,
      type: 'ENTREE',
      quantityKg: totalReconditionedKg,
      quantityPallets: Math.ceil(totalReconditionedKg / (targetProduct.kgPerPallet || 300)),
      performedBy: 'Reconditionnement',
      referenceDoc: 'RECOND-2026-12KG-3KG',
      notes: `Entrée de ${totalReconditionedKg} Kg de ${targetProduct.name} issu du reconditionnement`,
    }
  });

  const createdBLs = [];
  let seq = 279;

  for (let i = 0; i < rawData.length; i++) {
    const r = rawData[i];
    const [d, m, y] = r.date.split('/');
    const isoDate = `${y}-${m}-${d}`;
    const blNumber = `BL-MLHMD-2026-${String(seq).padStart(4, '0')}`;
    seq++;

    const client = await getOrCreateClient(r.clientName);
    const cartons = Math.round(r.quantityKg / 3);
    const pallets = Math.max(1, Math.ceil(r.quantityKg / (targetProduct.kgPerPallet || 300)));

    const bl = await prisma.deliveryNoteBL.create({
      data: {
        id: `bl-mlhmd-recond-${seq}-${Date.now()}`,
        createdAt: new Date(`${isoDate}T10:${String(i % 60).padStart(2, '0')}:00.000Z`),
        companyId: 'STE_1',
        blNumber,
        orderId: '',
        orderNumber: '',
        clientId: client.id,
        clientName: client.name,
        clientAddress: client.address || 'Casablanca',
        clientPhone: client.phone || '',
        clientEmail: client.email || '',
        frigoId: frigoZahi.id,
        frigoName: frigoZahi.name,
        date: isoDate,
        items: [
          {
            productId: targetProduct.id,
            productCode: targetProduct.code,
            productName: 'ar sahar 3kg mlhmd',
            quantityKg: r.quantityKg,
            quantityCartons: cartons,
            kgPerCarton: 3,
            packagingFormat: '3 Kg',
            theoreticalKg: r.quantityKg,
            weighedKg: r.quantityKg,
            isWeighed: true,
            quantityPallets: pallets,
            unitPriceHT: 0,
            totalHT: 0,
          }
        ],
        totalKg: r.quantityKg,
        totalCartons: cartons,
        totalPallets: pallets,
        totalHT: 0,
        totalTTC: 0,
        status: 'LIVRÉ',
        stockDecremented: true,
        frigoEmployeeApproved: true,
        frigoApprovedBy: 'Saisie Reconditionnement',
        frigoApprovedAt: `${isoDate}T12:00:00.000Z`,
        signedByName: client.name,
        signedAt: `${isoDate}T12:00:00.000Z`,
        whatsappSent: true,
        emailSent: false,
        logs: [
          {
            id: `log-${Date.now()}-${i}`,
            timestamp: `${isoDate} 12:00`,
            action: 'Création & Validation automatique rétroactive (Reconditionnement Datte 12KG)',
            author: 'Reconditionnement'
          }
        ]
      }
    });

    createdBLs.push(bl);

    // Register stock movement for the delivery
    await prisma.productStockMovement.create({
      data: {
        productId: targetProduct.id,
        productName: targetProduct.name,
        productCode: targetProduct.code,
        frigoId: frigoZahi.id,
        frigoName: frigoZahi.name,
        type: 'SORTIE',
        quantityKg: r.quantityKg,
        quantityPallets: pallets,
        performedBy: 'Livraison Client',
        referenceDoc: blNumber,
        notes: `Sortie BL ${blNumber} (${r.quantityKg} Kg) - Client: ${client.name}`,
      }
    });
  }

  console.log(`\n🎉 SUCCESS! Created ${createdBLs.length} Delivery Notes successfully!`);
  console.log(`First BL: [${createdBLs[0].blNumber}] Date: ${createdBLs[0].date} | Client: ${createdBLs[0].clientName} | Qty: ${createdBLs[0].totalKg} Kg`);
  console.log(`Last BL: [${createdBLs[createdBLs.length - 1].blNumber}] Date: ${createdBLs[createdBLs.length - 1].date} | Client: ${createdBLs[createdBLs.length - 1].clientName} | Qty: ${createdBLs[createdBLs.length - 1].totalKg} Kg`);
}

main()
  .catch(e => console.error('Error importing BLs:', e))
  .finally(() => prisma.$disconnect());
