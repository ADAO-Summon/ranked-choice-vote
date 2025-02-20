import { NextApiRequest, NextApiResponse } from 'next';
import { getTiebreakCandidates } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid workshop ID' });
  }

  try {
    const tiebreakCandidates = await getTiebreakCandidates(id);
    
    if (!tiebreakCandidates) {
      return res.status(404).json({ message: 'No active tiebreak round found' });
    }

    res.status(200).json(tiebreakCandidates);
  } catch (error) {
    console.error('Error fetching tiebreak candidates:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}