import { prisma } from '../prisma';

async function main() {
  const products = await prisma.product.findMany();
  console.log('--- PRODUCTS IN CATALOG ---');
  products.forEach(p => console.log(` - [${p.id}] ${p.code} : "${p.name}" (kgPerCarton: ${p.kgPerCarton}, price: ${p.sellingPriceHT})`));

  const frigos = await prisma.coldStorageFrigo.findMany();
  console.log('\n--- FRIGOS ---');
  frigos.forEach(f => console.log(` - [${f.id}] ${f.code} : "${f.name}"`));

  const clients = await prisma.client.findMany();
  console.log('\n--- CLIENTS ---');
  clients.forEach(c => console.log(` - [${c.id}] ${c.code} : "${c.name}"`));
}

main().finally(() => prisma.$disconnect());
