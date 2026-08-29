import { prisma } from '../prisma';

async function main() {
  console.log('🔄 Syncing missing clients from Delivery Notes (BLs) to Client table...');

  const bls = await prisma.deliveryNoteBL.findMany();
  const existingClients = await prisma.client.findMany();

  const clientMapById = new Map(existingClients.map(c => [c.id, c]));
  const clientMapByName = new Map(existingClients.map(c => [c.name.toLowerCase().trim(), c]));

  // Get max code number
  let maxCodeNum = 0;
  for (const c of existingClients) {
    const match = c.code?.match(/\d+/);
    if (match) {
      const n = parseInt(match[0], 10);
      if (n > maxCodeNum) maxCodeNum = n;
    }
  }

  let createdCount = 0;
  let linkedCount = 0;

  for (const bl of bls) {
    const rawName = (bl.clientName || '').trim();
    if (!rawName) continue;

    let client = (bl.clientId && clientMapById.get(bl.clientId)) || clientMapByName.get(rawName.toLowerCase());

    if (!client) {
      maxCodeNum++;
      const newCode = `CLT-${String(maxCodeNum).padStart(3, '0')}`;
      const newId = bl.clientId || `clt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      client = await prisma.client.create({
        data: {
          id: newId,
          code: newCode,
          name: rawName,
          companyName: rawName,
          ice: '',
          phone: bl.clientPhone || '',
          email: bl.clientEmail || '',
          address: bl.clientAddress || '',
          city: 'Casablanca',
          creditLimit: 300000,
          currentBalance: 0,
        }
      });

      clientMapById.set(client.id, client);
      clientMapByName.set(rawName.toLowerCase(), client);
      createdCount++;
      console.log(`✨ Created missing client: [${client.code}] "${client.name}" (ID: ${client.id})`);
    }

    if (bl.clientId !== client.id) {
      await prisma.deliveryNoteBL.update({
        where: { id: bl.id },
        data: { clientId: client.id }
      });
      linkedCount++;
    }
  }

  // Recalculate balances
  const allUpdatedClients = await prisma.client.findMany();
  for (const c of allUpdatedClients) {
    const clientBLs = await prisma.deliveryNoteBL.findMany({ where: { clientId: c.id } });
    const totalTTC = clientBLs.reduce((sum, b) => sum + (Number(b.totalTTC) || 0), 0);
    if (c.currentBalance !== totalTTC) {
      await prisma.client.update({
        where: { id: c.id },
        data: { currentBalance: totalTTC }
      });
    }
  }

  console.log(`\n🎉 Sync Finished!`);
  console.log(`   Clients created: ${createdCount}`);
  console.log(`   BL links updated: ${linkedCount}`);
  console.log(`   Total clients in PostgreSQL: ${allUpdatedClients.length}`);
}

main()
  .catch(e => console.error('Error during sync:', e))
  .finally(() => prisma.$disconnect());
