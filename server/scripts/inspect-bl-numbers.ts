import { prisma } from '../prisma';

async function main() {
  const bls = await prisma.deliveryNoteBL.findMany({ select: { id: true, blNumber: true, clientName: true, date: true } });
  console.log(`Total BLs in DB: ${bls.length}`);
  
  const numbers: number[] = [];
  bls.forEach(b => {
    const m = (b.blNumber || '').match(/(\d+)/g);
    if (m) {
      m.forEach(val => {
        const n = parseInt(val, 10);
        if (n > 0 && n < 100000 && n !== 2025 && n !== 2026) numbers.push(n);
      });
    }
  });
  console.log(`Max sequential number found: ${Math.max(...numbers, 0)}`);
  
  // Show all MLHMD BLs
  const mlhmd = bls.filter(b => (b.blNumber || '').includes('MLHMD'));
  console.log(`\nMLHMD BLs (${mlhmd.length}):`);
  mlhmd.forEach(b => console.log(` - ${b.blNumber} | ${b.clientName} | ${b.date}`));
}

main().finally(() => prisma.$disconnect());
