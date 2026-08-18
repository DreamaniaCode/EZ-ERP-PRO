import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding/initialization in PostgreSQL...');

  // 1. Companies
  const existingCompanies = await prisma.company.count();
  if (existingCompanies === 0) {
    await prisma.company.createMany({
      data: [
        {
          id: 'STE_1',
          code: 'MLHMD',
          name: 'MLHMD Sarl',
          shortName: 'MLHMD',
          ice: '',
          taxId: '',
          rc: '',
          patent: '',
          capital: '',
          address: '',
          city: '',
          phone: '',
          email: '',
          bankName: '',
          bankRib: '',
          blPrefix: 'BL-MLHMD',
          invoicePrefix: 'FAC-MLHMD'
        },
        {
          id: 'STE_2',
          code: 'AINRAB',
          name: 'Ain Rabat Sarl',
          shortName: 'Ain Rabat',
          ice: '',
          taxId: '',
          rc: '',
          patent: '',
          capital: '',
          address: '',
          city: '',
          phone: '',
          email: '',
          bankName: '',
          bankRib: '',
          blPrefix: 'BL-AINRAB',
          invoicePrefix: 'FAC-AINRAB'
        }
      ]
    });
    console.log('✅ Companies seeded.');
  }

  // 2. Company Info Settings
  const existingInfo = await prisma.companyInfo.findUnique({ where: { id: 'default' } });
  if (!existingInfo) {
    await prisma.companyInfo.create({
      data: {
        id: 'default',
        name: 'MLHMD Sarl',
        ice: '',
        rc: '',
        if: '',
        cnss: '',
        patente: '',
        address: '',
        city: '',
        phone: '',
        email: '',
        website: '',
        logoUrl: '',
        bankName: '',
        rib: '',
        swift: '',
        capital: ''
      }
    });
    console.log('✅ Company Info seeded.');
  }

  // 3. Super Admin User
  const existingUsers = await prisma.user.count();
  if (existingUsers === 0) {
    await prisma.user.create({
      data: {
        id: 'usr-1',
        name: 'Super Admin',
        email: 'admin@easyerp.com',
        role: 'ADMIN',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      }
    });
    console.log('✅ Default Super Admin user seeded.');
  }

  // 4. Frigos
  const existingFrigos = await prisma.coldStorageFrigo.count();
  if (existingFrigos === 0) {
    await prisma.coldStorageFrigo.create({
      data: {
        id: 'frigo-1',
        code: 'FRG-01',
        name: 'Entrepôt Ain Rabat (Principal)',
        location: 'Ain Rabat, Casablanca',
        managerName: 'Responsable Quai',
        managerPhone: '+212 600-000000',
        capacityPallets: 50000,
        whatsappGroup: 'Groupe WhatsApp Frigo Ain Rabat',
        whatsappGroupLink: ''
      }
    });
    console.log('✅ Default Frigo seeded.');
  }

  // 5. Initial Products
  const existingProducts = await prisma.product.count();
  if (existingProducts === 0) {
    await prisma.product.createMany({
      data: [
        {
          id: 'prd-sibort-5kg',
          code: 'PRD-SIBORT-5KG',
          name: 'Datte Algérienne Sibort 5 KG',
          category: 'Dattes Importées',
          origin: 'Algérie / Import',
          sellingPriceHT: 22,
          unitCostHT: 18,
          vatRate: 0.20,
          kgPerCarton: 5,
          cartonsPerPallet: 100,
          kgPerPallet: 500,
          minStockAlertKg: 5000,
          description: 'Produit principal 1: Datte Algérienne Sibort 5 KG',
        },
        {
          id: 'prd-datte-11kg',
          code: 'PRD-DATTE-11KG',
          name: 'Datte Algérienne 11 KG',
          category: 'Dattes Importées',
          origin: 'Algérie / Import',
          sellingPriceHT: 55,
          unitCostHT: 45,
          vatRate: 0.20,
          kgPerCarton: 11,
          cartonsPerPallet: 100,
          kgPerPallet: 1100,
          minStockAlertKg: 5000,
          description: 'Produit principal 2: Datte Algérienne 11 KG',
        }
      ]
    });
    console.log('✅ Initial Products seeded.');
  }

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
