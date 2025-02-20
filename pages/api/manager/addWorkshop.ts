import cuid from 'cuid'
import prisma from '@/lib/prismaClient'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { NextApiRequest, NextApiResponse } from 'next'

function generateShortId(name: string, existingIds: string[] = []) {
    let shortId = name.toLowerCase().replace(/[^a-z0-9\s]/g, '');

    shortId = shortId.replace(/\s+/g, '-').replace(/-+/g, '-');

    shortId = shortId.slice(0, 7);

    shortId = shortId.replace(/-+$/, '');

    let uniqueId = shortId;
    let counter = 1;
    while (existingIds.includes(uniqueId)) {
        const suffix = counter.toString();
        uniqueId = shortId.slice(0, 7 - suffix.length) + suffix;
        counter++;
    }

    return uniqueId;
}

async function createAndInsertNewCodes(workshopId: string, amount = 1000) {
    const rcs = []
    for (let i = 0; i < amount; i++) {
        const code = cuid()
        rcs.push({ code: code.slice(17), workshopId })
    }
    return prisma.registrationCode.createMany({
        data: rcs
    })
}

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
        const { name, adminEmail, secondaryAdminEmail, scheduledFor } = req.body

        const allShortIds = (await prisma.workshop.findMany({
            select: {
                shortIdName: true
            }
        })).map(w => w.shortIdName)

        const newWorkshop = await prisma.workshop.create({
            data: {
                adminEmail,
                secondaryAdminEmail,
                readableName: name,
                shortIdName: generateShortId(name, allShortIds),
                scheduledFor
            }
        })

        await createAndInsertNewCodes(newWorkshop.id)

        await prisma.managerAction.create({
            data: {
              managerId: currentManager.id,
              actionType: 'ADD_WORKSHOP',
              details: JSON.stringify({ newWorkshopId: newWorkshop.id, newWorkshopAdminEmail: adminEmail }),
            },
          })

        return res.status(201).json(newWorkshop)
    }

    return res.status(405).json({ message: 'Method not allowed' })
}