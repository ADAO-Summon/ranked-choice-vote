import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import prisma from '@/lib/prismaClient'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    if (!session || !session.user?.email) {
        return res.status(401).json({ message: 'Unauthorized' })
    }

    const manager = await prisma.manager.findUnique({
        where: { email: session.user.email },
    })

    if (!manager) {
        return res.status(403).json({ message: 'Forbidden' })
    }

    if (req.method === 'GET') {
        const workshops = await prisma.workshop.findMany()
        return res.json(workshops)
    } else if (req.method === 'PUT') {
        const { id, readableName, adminEmail, secondaryAdminEmail } = req.body
        const updatedWorkshop = await prisma.workshop.update({
            where: { id },
            data: { readableName, adminEmail, secondaryAdminEmail },
        })

        // Log the action
        await prisma.managerAction.create({
            data: {
                managerId: manager.id,
                actionType: 'UPDATE_WORKSHOP',
                details: JSON.stringify({ workshopId: id, changes: { readableName, adminEmail } }),
            },
        })

        return res.json(updatedWorkshop)
    }

    return res.status(405).json({ message: 'Method not allowed' })
}