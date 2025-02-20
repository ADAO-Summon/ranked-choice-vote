// lib/adminHandlerWrapper.ts

import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../pages/api/auth/[...nextauth]'
import prisma from '@/lib/prismaClient'

type AdminAction = (workshopId: string) => Promise<any> | ((workshopId: string, count: number) => Promise<any>)

export function adminHandlerWrapper(actionName: string, action: AdminAction, includeCount: boolean = false) {
  return async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' })
    }

    const session = await getServerSession(req, res, authOptions)

    if (!session || !session.user || !session.user.email) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const body = JSON.parse(req.body)

    const { workshopId } = body

    let count = 0

    if (includeCount) count = body.count


    if (!workshopId) {
      return res.status(400).json({ message: 'Workshop ID is required' })
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      })

      if (!user || !user.emailVerified) {
        return res.status(403).json({ message: 'Email not verified' })
      }

      const workshop = await prisma.workshop.findUnique({
        where: { id: workshopId },
        select: {
          adminEmail: true,
          secondaryAdminEmail: true
        }
      })

      if (!workshop) {
        return res.status(404).json({ message: 'Workshop not found' })
      }

      if (workshop.adminEmail !== user.email) {
        if (!workshop.secondaryAdminEmail || workshop.secondaryAdminEmail !== user.email) {
          return res.status(403).json({ message: 'Not authorized to manage this workshop' })
        }
      }

      // Log the admin action
      await prisma.adminActionLog.create({
        data: {
          email: user.email!,
          action: actionName,
          workshopId: workshopId,
          details: JSON.stringify(req.body),
        },
      })

      //@ts-ignore
      const result = includeCount ? await action(workshopId, count) : await action(workshopId)
      res.status(200).json(result)
    } catch (error) {
      console.error(`Error in ${actionName}:`, error)

      // Log the error
      await prisma.adminActionLog.create({
        data: {
          email: session.user.email,
          action: `${actionName} - Error`,
          workshopId: workshopId,
          details: JSON.stringify(error),
        },
      })

      res.status(500).json({ message: `Error in ${actionName}`, error: error })
    }
  }
}