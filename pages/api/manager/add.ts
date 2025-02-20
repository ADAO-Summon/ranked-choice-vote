import prisma from '@/lib/prismaClient'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session || !session.user?.email) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const currentManager = await prisma.manager.findUnique({
    where: { email: session.user.email },
  })

  if (!currentManager) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  if (req.method === 'POST') {
    const { email } = req.body

    const existingManager = await prisma.manager.findUnique({
      where: { email },
    })

    if (existingManager) {
      return res.status(400).json({ message: 'Manager with this email already exists' })
    }

    const newManager = await prisma.manager.create({
      data: { email },
    })

    await prisma.managerAction.create({
      data: {
        managerId: currentManager.id,
        actionType: 'ADD_MANAGER',
        details: JSON.stringify({ newManagerId: newManager.id, newManagerEmail: email }),
      },
    })

    return res.status(201).json(newManager)
  }

  return res.status(405).json({ message: 'Method not allowed' })
}