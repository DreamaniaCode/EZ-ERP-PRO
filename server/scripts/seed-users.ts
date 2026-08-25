import { prisma } from '../prisma';

async function main() {
  console.log('Seeding operational users in PostgreSQL...');

  const operationalUsers = [
    {
      id: 'usr-admin-1',
      name: 'Super Admin',
      email: 'admin@easyerp.com',
      role: 'SUPER_ADMIN',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'usr-frigo-1',
      name: 'Responsable Frigo (Ain Rabat)',
      email: 'frigo@easyerp.com',
      role: 'RESPONSABLE_FRIGO',
      assignedFrigoId: 'frigo-1',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'usr-commercial-1',
      name: 'Commercial & Ventes',
      email: 'commercial@easyerp.com',
      role: 'COMMERCIAL',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'usr-comptable-1',
      name: 'Comptable & Trésorerie',
      email: 'comptable@easyerp.com',
      role: 'COMPTABLE',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'usr-controleur-1',
      name: 'Contrôleur Quai & Sécurité',
      email: 'controleur@easyerp.com',
      role: 'CONTROLEUR',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'usr-stock-1',
      name: 'Agent de Stock',
      email: 'stock@easyerp.com',
      role: 'AGENT_STOCK',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    },
  ];

  for (const u of operationalUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        assignedFrigoId: u.assignedFrigoId || null,
        avatar: u.avatar,
      },
      update: {
        name: u.name,
        role: u.role,
        assignedFrigoId: u.assignedFrigoId || null,
        avatar: u.avatar,
      }
    });
    console.log(`[User Ready] ${u.name} (${u.email}) - Role: ${u.role}`);
  }

  const allUsers = await prisma.user.findMany();
  console.log(`\n🎉 Total Users in PostgreSQL: ${allUsers.length}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
