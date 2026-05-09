import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const accs = await prisma.account.findMany({ select: { id: true, name: true, alias: true }, take: 5 });
console.log('Accounts:', JSON.stringify(accs, null, 2));
const sas = await prisma.serviceAccount.findMany({ 
  where: { accountId: { not: null } },
  select: { accountName: true, accountId: true, alias: true },
  take: 5
});
console.log('SA with accountId:', JSON.stringify(sas, null, 2));
const users = await prisma.appUser.findMany({ select: { email: true, role: true } });
console.log('AppUsers:', JSON.stringify(users));
await prisma.$disconnect();
