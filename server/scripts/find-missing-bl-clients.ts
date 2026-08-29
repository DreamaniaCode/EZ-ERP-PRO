import { prisma } from '../prisma';

async function main() {
  const bls = await prisma.deliveryNoteBL.findMany();
  const clients = await prisma.client.findMany();
  
  console.log(`Total BLs: ${bls.length}`);
  console.log(`Total Clients in Client table: ${clients.length}`);

  const clientIdSet = new Set(clients.map(c => c.id));
  const clientNameMap = new Map(clients.map(c => [c.name.toLowerCase().trim(), c]));

  const missingClients = new Map<string, { count: number; totalKg: number; totalHT: number; blIds: string[]; sampleFrigo?: string }>();

  for (const bl of bls) {
    const rawName = (bl.clientName || '').trim();
    const hasValidClientId = bl.clientId && clientIdSet.has(bl.clientId);
    const hasValidClientName = rawName && clientNameMap.has(rawName.toLowerCase());

    if (!hasValidClientId && !hasValidClientName) {
      const entry = missingClients.get(rawName || 'SANS_NOM') || { count: 0, totalKg: 0, totalHT: 0, blIds: [] };
      entry.count++;
      entry.totalKg += Number(bl.totalKg) || 0;
      entry.totalHT += Number(bl.totalHT) || 0;
      entry.blIds.push(bl.blNumber);
      if (bl.frigoName) entry.sampleFrigo = bl.frigoName;
      missingClients.set(rawName || 'SANS_NOM', entry);
    }
  }

  console.log(`\n🚨 Missing / Unlinked Clients found in BLs: ${missingClients.size}`);
  for (const [name, data] of missingClients.entries()) {
    console.log(` - "${name}": ${data.count} BLs (Bons: ${data.blIds.join(', ')}), ${data.totalKg} Kg, ${data.totalHT} DH (Frigo: ${data.sampleFrigo || 'N/A'})`);
  }
}

main().finally(() => prisma.$disconnect());
