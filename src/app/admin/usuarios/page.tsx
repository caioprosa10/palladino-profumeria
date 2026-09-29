import { requireAdminPage } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import AdminUsersClient from './AdminUsersClient'

export default async function AdminUsuarios() {
  const admin = await requireAdminPage()

  if (admin.role !== 'SUPERADMIN') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ color: '#ef4444', marginBottom: '10px' }}>Acesso Negado</h1>
        <p>Apenas o Super Administrador pode acessar a gestão de contas administrativas.</p>
      </div>
    )
  }

  const usuarios = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      nome: true,
      email: true,
      role: true,
      ativo: true,
      createdAt: true
    }
  })

  return <AdminUsersClient initialUsers={usuarios} />
}
