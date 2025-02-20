import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import prisma from '@/lib/prismaClient';
import { encrypt, decrypt } from '@/lib/encryption';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.email) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    // Store the backup factor key
    const { key } = req.body;
    console.log({key})

    if (!key) {
      return res.status(400).json({ message: 'Key is required' });
    }

    const encryptedKey = encrypt(key);
    console.log({encryptedKey})

    try {
      await prisma.mPCBackupFactorKey.upsert({
        where: { email: session.user.email },
        update: { key: encryptedKey },
        create: {
          email: session.user.email,
          key: encryptedKey,
          user: { connect: { email: session.user.email } },
        },
      });

      return res.status(200).json({ message: 'Backup factor key stored successfully' });
    } catch (error) {
      console.error('Error storing backup factor key:', error);
      return res.status(500).json({ message: 'Error storing backup factor key' });
    }
  } else if (req.method === 'GET') {
    // Retrieve the backup factor key
    try {
      const backupFactorKey = await prisma.mPCBackupFactorKey.findUnique({
        where: { email: session.user.email },
      });

      if (!backupFactorKey) {
        return res.status(404).json({ message: 'Backup factor key not found' });
      }

      const decryptedKey = decrypt(backupFactorKey.key);

      return res.status(200).json({ key: decryptedKey });
    } catch (error) {
      console.error('Error retrieving backup factor key:', error);
      return res.status(500).json({ message: 'Error retrieving backup factor key' });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}