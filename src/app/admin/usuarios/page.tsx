import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminUsersClient from './AdminUsersClient'

export default async function AdminUsuarios() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  if (!session) redirect('/login')

  const payload = await decrypt(session)
  if (!payload || payload.role !== 'SUPERADMIN') {
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
