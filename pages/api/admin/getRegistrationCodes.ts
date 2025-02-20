import { getRegistrationCodes } from '@/utils/adminActions'
import prisma from '@/lib/prismaClient'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    if (!session || !session.user?.email) {
        return res.status(401).json({ message: 'Unauthorized' })
    }

    if (req.method === 'POST') {
        const { workshopId, count } = JSON.parse(req.body)

        const currentManager = await prisma.manager.findUnique({
            where: { email: session.user.email },
        })

        if (!currentManager) {
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
                if (!workshop.secondaryAdminEmail || workshop.secondaryAdminEmail !== session.user.email) {
                    return res.status(403).json({ message: 'Forbidden' })
                }
            }
        }

        await prisma.adminActionLog.create({
            data: {
                email: session.user.email!,
                action: 'GET_REGISTRATION_CODES',
                workshopId: workshopId as string,
                details: JSON.stringify(req.body),
            },
        })

        try {
            const codes = await getRegistrationCodes(workshopId, count)
            return res.status(200).json(codes)
        } catch (error) {
            await prisma.adminActionLog.create({
                data: {
                    email: session.user.email,
                    action: `ERROR_GET_REGISTRATION_CODES`,
                    workshopId: workshopId as string,
                    details: JSON.stringify(error),
                },
            })
        }

    }

    return res.status(405).json({ message: 'Method not allowed' })
}