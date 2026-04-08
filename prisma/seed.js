require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@blogvca.local';
  const plainPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
  const name = process.env.SEED_ADMIN_NAME || 'Administrador';
  const role = process.env.SEED_ADMIN_ROLE || 'Admin';

  const password = await bcrypt.hash(plainPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password,
      role,
      active: true,
    },
    create: {
      email,
      name,
      password,
      role,
      active: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
    },
  });

  console.log('Seed concluido. Usuario admin pronto para testes:');
  console.log(`- id: ${admin.id}`);
  console.log(`- email: ${admin.email}`);
  console.log(`- nome: ${admin.name || ''}`);
  console.log(`- role: ${admin.role}`);
  console.log(`- ativo: ${admin.active}`);
  console.log('Senha usada: valor de SEED_ADMIN_PASSWORD ou default Admin@123');
}

main()
  .catch((error) => {
    console.error('Falha ao executar seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
