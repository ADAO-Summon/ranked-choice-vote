import prisma from '@/lib/prismaClient'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { NextApiRequest, NextApiResponse } from 'next'
import receiveRegistrationCodes from '@/utils/receiveRegistrationCodes'

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session || !session.user?.email) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  if (req.method === 'POST') {

    const { workshopId, count } = JSON.parse(req.body)

    try {

      const currentManager = await prisma.manager.findUnique({
        where: { email: session.user.email },
      })

      const workshop = await prisma.workshop.findUnique({
        where: {
          id: workshopId
        },
        select: {
          adminEmail: true,
          secondaryAdminEmail: true
        }
      })

      if (!workshop) {
        return res.status(404).json({ message: 'Workshop not found' })
      }

      if (workshop.adminEmail !== session.user.email) {
        if ((!workshop.secondaryAdminEmail || workshop.secondaryAdminEmail !== session.user.email) && !currentManager) {
          return res.status(403).json({ message: 'Forbidden' })
        }
      }
      await prisma.adminActionLog.create({
        data: {
          email: session.user.email!,
          action: 'REQUEST_REGISTRATION_CODES',
          workshopId: workshopId,
          details: JSON.stringify(req.body),
        },
      })

      await receiveRegistrationCodes(workshopId, session.user.email, count || 1000)

      return res.status(201).json({ message: 'Email has been sent. It might take a few minutes. Please make sure to check your spam folder and refresh your email client.' })
    } catch (ex) {

      console.error(`Error retrieving registration codes`, ex)

      await prisma.adminActionLog.create({
        data: {
          email: session.user.email,
          action: `ERROR_REQUEST_REGISTRATION_CODES`,
          workshopId: workshopId,
          details: JSON.stringify(ex),
        },
      })
      res.status(500).json({ message: `Unexpected error retrieving registration codes`, error: ex })

    }
  }

  return res.status(405).json({ message: 'Method not allowed' })
}