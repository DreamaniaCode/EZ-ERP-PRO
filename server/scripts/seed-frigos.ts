import { prisma } from '../prisma';

async function main() {
  console.log('Seeding Frigos in PostgreSQL...');

  const frigosToSeed = [
    {
      id: 'frigo-1',
      code: 'FRG-01',
      name: 'Entrepôt Skhirat (Principal)',
      location: 'Skhirat / Région Rabat',
      managerName: 'Miloud (Chef de Quai)',
      managerPhone: '+212 661-000001',
      capacityPallets: 50000,
      whatsappGroup: 'Groupe WhatsApp Frigo Skhirat',
    },
    {
      id: 'frigo-2',
      code: 'FRG-02',
      name: 'Frigo Ain Rabat (Stockage Froid)',
      location: 'Ain Rabat, Casablanca',
      managerName: 'Hassan (Responsable Quai)',
      managerPhone: '+212 661-000002',
      capacityPallets: 35000,
      whatsappGroup: 'Groupe WhatsApp Frigo Ain Rabat',
    },
    {
      id: 'frigo-3',
      code: 'FRG-03',
      name: 'Frigo Tit Mellil / Zenata (Dépôt)',
      location: 'Tit Mellil, Casablanca',
      managerName: 'Rachid (Gestionnaire Stock)',
      managerPhone: '+212 661-000003',
      capacityPallets: 20000,
      whatsappGroup: 'Groupe WhatsApp Frigo Tit Mellil',
    },
  ];

  for (const f of frigosToSeed) {
    await prisma.coldStorageFrigo.upsert({
      where: { id: f.id },
      create: {
        id: f.id,
        code: f.code,
        name: f.name,
        location: f.location,
        managerName: f.managerName,
        managerPhone: f.managerPhone,
        capacityPallets: f.capacityPallets,
        whatsappGroup: f.whatsappGroup,
      },
      update: {
        code: f.code,
        name: f.name,
        location: f.location,
        managerName: f.managerName,
        managerPhone: f.managerPhone,
        capacityPallets: f.capacityPallets,
        whatsappGroup: f.whatsappGroup,
      }
    });
    console.log(`[Frigo Ready] ${f.code} - ${f.name} (${f.location})`);
  }

  // Also ensure initial stock records exist for all products in all frigos
  const products = await prisma.product.findMany();
  for (const f of frigosToSeed) {
    for (const p of products) {
      const existing = await prisma.frigoStockLevel.findUnique({
        where: { frigoId_productId: { frigoId: f.id, productId: p.id } }
      });
      if (!existing) {
        await prisma.frigoStockLevel.create({
          data: {
            frigoId: f.id,
            productId: p.id,
            quantityKg: f.id === 'frigo-1' && p.id === 'prd-sibort-5kg' ? 51804 : (f.id === 'frigo-2' ? 15000 : 5000),
            quantityPallets: f.id === 'frigo-1' && p.id === 'prd-sibort-5kg' ? 103 : 15,
          }
        });
      }
    }
  }

  const allFrigos = await prisma.coldStorageFrigo.findMany();
  console.log(`\n🎉 Total Frigos in PostgreSQL: ${allFrigos.length}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
