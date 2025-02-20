import { NextApiRequest, NextApiResponse } from "next"
// import { getServerSession } from "next-auth/next"
// import { authOptions } from "../auth/[...nextauth]"
// import prisma from '@/lib/prismaClient'
// import { changeRegistration } from "@/utils/adminActions"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(405).json({ message: 'Method not allowed' })

  //   if (req.method !== 'POST') {
  //     return res.status(405).json({ message: 'Method not allowed' })
  //   }

  //   const session = await getServerSession(req, res, authOptions)

  //   if (!session || !session.user || !session.user.email) {
  //     return res.status(401).json({ message: 'Unauthorized' })
  //   }

  //   const { registrationId, candidate, candidateName } = req.body

  //   if (!registrationId) {
  //     return res.status(400).json({ message: 'Registration ID is required' })
  //   }

  //   const candidateVal: null | boolean = (typeof (candidate) !== 'boolean') ? null : candidate
  //   const candidateNameVal: null | string = (typeof (candidateName) === 'undefined' || candidateName === null || candidateName === "") ? null : candidateName

  //   try {
  //     const user = await prisma.user.findUnique({
  //       where: { email: session.user.email },
  //     })

  //     if (!user || !user.emailVerified) {
  //       return res.status(403).json({ message: 'Email not verified' })
  //     }

  //     const reg = await prisma.registration.findUnique({
  //       where: { id: registrationId },
  //       include: {
  //         workshop: {
  //           select: {
  //             adminEmail: true,
  //             secondaryAdminEmail: true
  //           }
  //         }
  //       }
  //     })

  //     const workshop = reg?.workshop

  //     if (!workshop) {
  //       return res.status(404).json({ message: 'Workshop not found' })
  //     }

  //     if (workshop.adminEmail !== user.email) {
  //       if (!workshop.secondaryAdminEmail || workshop.secondaryAdminEmail !== user.email) {
  //         return res.status(403).json({ message: 'Not authorized to manage this workshop' })
  //       }
  //     }

  //     const result = await changeRegistration(candidateVal, candidateNameVal, registrationId)
  //     res.status(200).json(result)
  //   } catch (error) {
  //     console.error(`Error in Change Registration:`, error)
  //     res.status(500).json({ message: `Error in Change Registration`, error: error })
  //   }
}