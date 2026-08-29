import { prisma } from '../prisma';

async function main() {
  const clients = await prisma.client.findMany({ orderBy: { name: 'asc' } });
  console.log(`\n📋 List of ${clients.length} Clients in Database:`);
  
  for (const c of clients) {
    const blCount = await prisma.deliveryNoteBL.count({ where: { clientId: c.id } });
    const invCount = await prisma.invoice.count({ where: { clientId: c.id } });
    console.log(` - [${c.code}] "${c.name}" (ID: ${c.id}) | BLs: ${blCount} | Factures: ${invCount} | Solde: ${c.currentBalance} DH | ICE: ${c.ice || 'aucun'}`);
  }
}

main().finally(() => prisma.$disconnect());
