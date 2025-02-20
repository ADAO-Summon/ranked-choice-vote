import { WorkshopStatus } from "@/lib/workshopState";
import { VoteData } from "@/types/votings";

export const getStatusColor = (status: WorkshopStatus): [string, string] => {
    switch (status) {
        case 0:
            return ['#6B7280', '#4B5563'];
        case 1:
        case 2:
            return ['#3B82F6', '#2563EB'];
        case 6:
        case 7:
        case 8:
            return ['#10B981', '#059669'];
        case 3:
        case 4:
        case 5:
            return ['#FBBF24', '#D97706'];
        default:
            return ['#9CA3AF', '#6B7280'];
    }
}

export const fetchLastVote = async (workshopId: string): Promise<{ lastVote: VoteData | null, lastTiebreakVote: VoteData | null }> => {
    const res = await fetch('/api/user/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId }),
    })
    if (!res.ok) throw new Error('Failed to fetch last vote')
    return res.json()
}
