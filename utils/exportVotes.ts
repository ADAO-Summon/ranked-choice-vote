import { saveAs } from 'file-saver';

interface VoteData {
  email: string | null;
  stakeAddress: string;
  coseKeyHex: string | null;
  coseSignatureHex: string | null;
  message: string;
  selection1: string;
  selection2: string;
  selection3: string;
  selection4: string;
  selection5: string;
}

export async function exportVotesToCSV(workshopId: string, workshopIdName: string, tiebreak: boolean) {
  try {
    // Fetch the data from our API
    const response = await fetch(`/api/${tiebreak ? 'tiebreakVotes' : 'votes'}/${workshopId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch votes');
    }
    const votes: VoteData[] = await response.json();

    // Generate CSV content
    const csvContent = generateCSV(votes);

    // Create and save the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `workshop_${workshopIdName + (tiebreak ? '_tiebreak_' : '_')}votes.csv`);
  } catch (error) {
    console.error('Error exporting votes:', error);
    throw error;
  }
}

function generateCSV(data: VoteData[]): string {
  const headers = [
    'Email',
    'Stake Address',
    'COSE Key Hex',
    'COSE Signature Hex',
    'Message',
    'Selection 1',
    'Selection 2',
    'Selection 3',
    'Selection 4',
    'Selection 5'
  ];

  const csvRows = [
    headers.join(';'),
    ...data.map(row => 
      [
        row.email,
        row.stakeAddress,
        row.coseKeyHex,
        row.coseSignatureHex,
        row.message,
        row.selection1,
        row.selection2,
        row.selection3,
        row.selection4,
        row.selection5
      ].map(value => `"${value ?? ''}"`).join(';')
    )
  ];

  return csvRows.join('\n');
}