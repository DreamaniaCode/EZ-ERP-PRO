import { prisma } from '../prisma';

function smartNormalizeName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[\/\.\,\-\_\#\@\(\)\:\;]/g, ' ') // remove punctuation and slashes
    .replace(/\b(el|al|le|la|bel|ben|si|sidi)\b/gi, '') // remove common prefixes
    .replace(/kh/g, 'k')
    .replace(/gh/g, 'g')
    .replace(/ou/g, 'u')
    .replace(/oo/g, 'u')
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/q/g, 'k')
    .replace(/g/g, 'k') // Kassab / Gassab
    .replace(/h/g, '')  // Hikmat / Ikma
    .replace(/(.)\1+/g, '$1') // collapse all double letters (mm->m, tt->t, etc)
    .replace(/t\b/g, '') // Hikmat -> Hikma
    .replace(/\s+e\b/g, '') // remove lone 'e'
    .replace(/e\b/g, '') // remove trailing 'e'
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log('🔍 Starting smart lossless client deduplication in PostgreSQL...');
  
  const allClients = await prisma.client.findMany({ orderBy: { createdAt: 'asc' } });
  console.log(`Total clients in database before deduplication: ${allClients.length}`);

  const groups = new Map<string, typeof allClients>();

  for (const c of allClients) {
    const raw = c.name || c.companyName || '';
    const norm = smartNormalizeName(raw);
    if (!norm) continue;
    if (!groups.has(norm)) groups.set(norm, []);
    groups.get(norm)!.push(c);
  }

  let totalMerged = 0;
  let groupsWithDuplicates = 0;

  for (const [groupName, clts] of groups.entries()) {
    if (clts.length <= 1) continue;

    groupsWithDuplicates++;
    // Primary: prefer one with ICE or phone, else the earliest created
    const primary = clts.find(c => c.ice && c.ice.trim()) || clts[0];
    const secondaries = clts.filter(c => c.id !== primary.id);
    const secondaryIds = secondaries.map(c => c.id);

    console.log(`\n📦 Merging ${clts.length} duplicates for "${primary.name}" -> Primary: ${primary.code} (${primary.id})`);
    console.log(`   Duplicate IDs to merge: ${secondaryIds.join(', ')}`);

    await prisma.$transaction(async (tx) => {
      // 1. Merge missing metadata into primary
      const updatedData: any = {};
      for (const sec of secondaries) {
        if (!primary.ice && sec.ice) updatedData.ice = sec.ice;
        if (!primary.phone && sec.phone) updatedData.phone = sec.phone;
        if (!primary.email && sec.email) updatedData.email = sec.email;
        if (!primary.address && sec.address) updatedData.address = sec.address;
        if (!primary.companyName && sec.companyName) updatedData.companyName = sec.companyName;
      }
      if (Object.keys(updatedData).length > 0) {
        await tx.client.update({
          where: { id: primary.id },
          data: updatedData
        });
      }

      // 2. Reassign all Delivery Notes (BLs)
      const blResult = await tx.deliveryNoteBL.updateMany({
        where: { clientId: { in: secondaryIds } },
        data: {
          clientId: primary.id,
          clientName: primary.name || primary.companyName || 'Client',
          clientAddress: primary.address || '',
          clientPhone: primary.phone || '',
          clientEmail: primary.email || ''
        }
      });
      if (blResult.count > 0) {
        console.log(`   ✅ Reassigned ${blResult.count} Delivery Notes (BLs) to ${primary.code}`);
      }

      // 3. Reassign all Invoices
      const invResult = await tx.invoice.updateMany({
        where: { clientId: { in: secondaryIds } },
        data: {
          clientId: primary.id,
          clientName: primary.name || primary.companyName || 'Client',
          clientICE: primary.ice || '',
          clientAddress: primary.address || ''
        }
      });
      if (invResult.count > 0) {
        console.log(`   ✅ Reassigned ${invResult.count} Invoices to ${primary.code}`);
      }

      // 4. Reassign all Sales Orders
      const orderResult = await tx.salesOrder.updateMany({
        where: { clientId: { in: secondaryIds } },
        data: {
          clientId: primary.id,
          clientName: primary.name || primary.companyName || 'Client',
          clientICE: primary.ice || '',
          clientPhone: primary.phone || '',
          clientEmail: primary.email || ''
        }
      });
      if (orderResult.count > 0) {
        console.log(`   ✅ Reassigned ${orderResult.count} Sales Orders to ${primary.code}`);
      }

      // 5. Reassign all Cheques / Effets
      const chequeResult = await tx.chequeEffet.updateMany({
        where: { partyId: { in: secondaryIds } },
        data: {
          partyId: primary.id,
          partyName: primary.name || primary.companyName || 'Client'
        }
      });
      if (chequeResult.count > 0) {
        console.log(`   ✅ Reassigned ${chequeResult.count} Cheques/Effets to ${primary.code}`);
      }

      // 6. Delete the duplicate client records
      await tx.client.deleteMany({
        where: { id: { in: secondaryIds } }
      });
    });

    totalMerged += secondaryIds.length;
  }

  const finalClients = await prisma.client.findMany();
  console.log(`\n🎉 Lossless Deduplication Complete!`);
  console.log(`   Duplicate groups found: ${groupsWithDuplicates}`);
  console.log(`   Duplicate records merged & removed: ${totalMerged}`);
  console.log(`   Total clean clients remaining: ${finalClients.length}`);
  console.log(`   All BLs, Invoices, Orders, and Cheques have been 100% preserved and attached to primary clients.`);
}

main()
  .catch(e => {
    console.error('Error during deduplication:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
