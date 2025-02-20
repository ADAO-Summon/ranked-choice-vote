import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prismaClient'
import { authOptions } from '../auth/[...nextauth]'
import { getServerSession } from 'next-auth/next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

  if (!session || !session.user?.email) {
    return res.status(401).json({ isManager: false })
  }

  const manager = await prisma.manager.findUnique({
    where: { email: session.user.email },
  })

  return res.status(200).json({ isManager: !!manager })
}