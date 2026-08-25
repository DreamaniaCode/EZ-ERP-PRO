import { prisma } from '../prisma';

async function main() {
  console.log('Connecting to PostgreSQL...');
  const bls = await prisma.deliveryNoteBL.findMany();
  console.log(`Found ${bls.length} BLs in database.`);

  const clientMap = new Map<string, { totalHT: number; totalTTC: number; totalKg: number; blCount: number; sampleAddress?: string; samplePhone?: string; sampleEmail?: string }>();

  for (const bl of bls) {
    const rawName = (bl.clientName || '').trim();
    if (!rawName) continue;

    const existing = clientMap.get(rawName) || { totalHT: 0, totalTTC: 0, totalKg: 0, blCount: 0 };
    existing.totalHT += Number(bl.totalHT) || 0;
    existing.totalTTC += Number(bl.totalTTC) || 0;
    existing.totalKg += Number(bl.totalKg) || 0;
    existing.blCount += 1;
    if (bl.clientAddress) existing.sampleAddress = bl.clientAddress;
    if (bl.clientPhone) existing.samplePhone = bl.clientPhone;
    if (bl.clientEmail) existing.sampleEmail = bl.clientEmail;

    clientMap.set(rawName, existing);
  }

  console.log(`Extracted ${clientMap.size} unique clients from BLs.`);

  let createdCount = 0;
  let index = 1;

  for (const [clientName, data] of clientMap.entries()) {
    const cleanCode = `CLT-${String(index).padStart(3, '0')}`;
    index++;

    // Check if client already exists in DB
    let client = await prisma.client.findFirst({
      where: {
        OR: [
          { name: { equals: clientName, mode: 'insensitive' } },
          { code: cleanCode },
        ]
      }
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          code: cleanCode,
          name: clientName,
          companyName: clientName,
          ice: '',
          email: data.sampleEmail || '',
          phone: data.samplePhone || '',
          address: data.sampleAddress || '',
          city: 'Casablanca',
          creditLimit: 300000,
          currentBalance: data.totalTTC,
        }
      });
      createdCount++;
      console.log(`[Created] ${client.code} - ${client.name} (${data.blCount} BLs, ${data.totalTTC.toFixed(2)} DH)`);
    }

    // Link BLs to this client ID
    await prisma.deliveryNoteBL.updateMany({
      where: { clientName: clientName },
      data: { clientId: client.id }
    });
  }

  console.log(`\n🎉 Successfully created ${createdCount} clients and linked all ${bls.length} BLs in PostgreSQL!`);
  
  const allClients = await prisma.client.findMany();
  console.log(`Total clients in PostgreSQL now: ${allClients.length}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
