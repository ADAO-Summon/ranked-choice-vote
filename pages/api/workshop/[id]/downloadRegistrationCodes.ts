import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import prisma from '@/lib/prismaClient'
import generateRegistrationCodesPDF from '@/utils/generateRegistrationCodesPDF'

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session || !session.user?.email) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    const { id: workshopId } = req.query
    const count = parseInt(req.query.count as string) || 1000

    const currentManager = await prisma.manager.findUnique({
      where: { email: session.user.email },
    })

    if (!currentManager) {

      const workshop = await prisma.workshop.findUnique({
        where: {
          id: workshopId as string
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
          return res.status(403).json({ message: 'Not authorized to manage this workshop' })
        }
      }
    }
    await prisma.adminActionLog.create({
      data: {
        email: session.user.email!,
        action: 'DOWNLOAD_REGISTRATION_CODES',
        workshopId: workshopId as string,
        details: JSON.stringify(req.body),
      },
    })
    try {
      const pdfBuffer = await generateRegistrationCodesPDF(workshopId as string, count)

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename=registration_codes_${workshopId}.pdf`)
      res.send(pdfBuffer)
    } catch (error) {
      console.error('Error generating PDF:', error)
      await prisma.adminActionLog.create({
        data: {
          email: session.user.email,
          action: `ERROR_DOWNLOAD_REGISTRATION_CODES`,
          workshopId: workshopId as string,
          details: JSON.stringify(error),
        },
      })
      res.status(500).json({ message: 'Error generating PDF' })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}