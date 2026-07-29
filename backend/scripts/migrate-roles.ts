import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type Perm = { canView: boolean; canAdd: boolean; canEdit: boolean; canDelete: boolean }

// Seeds two starter roles that reproduce the app's old hardcoded MANAGER/EMPLOYEE
// behavior, then links any existing users carrying those role names to them —
// so upgrading to role-based permissions doesn't change what current users can see.
const DEFAULT_ROLES: { name: string; isAllSites: boolean; permissions: Record<string, Perm> }[] = [
  {
    name: 'MANAGER',
    isAllSites: true,
    permissions: {
      dashboard:          { canView: true,  canAdd: false, canEdit: false, canDelete: false },
      tracker:            { canView: true,  canAdd: true,  canEdit: false, canDelete: false },
      billing:            { canView: true,  canAdd: true,  canEdit: false, canDelete: false },
      attendance:         { canView: true,  canAdd: true,  canEdit: false, canDelete: false },
      'admin-attendance': { canView: false, canAdd: false, canEdit: false, canDelete: false },
      customers:          { canView: true,  canAdd: true,  canEdit: true,  canDelete: false },
      vendors:            { canView: true,  canAdd: true,  canEdit: true,  canDelete: false },
      reports:            { canView: false, canAdd: false, canEdit: false, canDelete: false },
    },
  },
  {
    name: 'EMPLOYEE',
    isAllSites: true,
    permissions: {
      dashboard:          { canView: true,  canAdd: false, canEdit: false, canDelete: false },
      tracker:            { canView: true,  canAdd: true,  canEdit: false, canDelete: false },
      billing:            { canView: false, canAdd: false, canEdit: false, canDelete: false },
      attendance:         { canView: true,  canAdd: true,  canEdit: false, canDelete: false },
      'admin-attendance': { canView: false, canAdd: false, canEdit: false, canDelete: false },
      customers:          { canView: false, canAdd: false, canEdit: false, canDelete: false },
      vendors:            { canView: false, canAdd: false, canEdit: false, canDelete: false },
      reports:            { canView: false, canAdd: false, canEdit: false, canDelete: false },
    },
  },
]

async function main() {
  const roleIdByName: Record<string, number> = {}

  for (const def of DEFAULT_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: def.name },
      update: {},
      create: { name: def.name, isAllSites: def.isAllSites },
    })
    roleIdByName[def.name] = role.id
    for (const [module, perm] of Object.entries(def.permissions)) {
      await prisma.rolePermission.upsert({
        where: { roleId_module: { roleId: role.id, module } },
        update: {},
        create: { roleId: role.id, module, ...perm },
      })
    }
    console.log(`Seeded role "${def.name}" (id ${role.id})`)
  }

  for (const name of Object.keys(roleIdByName)) {
    const { count } = await prisma.user.updateMany({
      where: { role: name, roleId: null },
      data: { roleId: roleIdByName[name] },
    })
    if (count) console.log(`Linked ${count} existing "${name}" user(s) to the seeded role`)
  }

  console.log('Role migration complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
