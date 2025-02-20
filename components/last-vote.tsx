import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { fetchLastVote } from '@/utils'

type LastVoteProps = {
    tiebreakVote: boolean
    workshopId: string
}

export function LastVote({ tiebreakVote, workshopId }: LastVoteProps) {
    const [expanded, setExpanded] = useState(false)

    const { data, isLoading, error } = useQuery({
        queryKey: ['lastVote', workshopId],
        queryFn: () => fetchLastVote(workshopId),
    })

    if (isLoading) return <Skeleton className="h-20 w-full" />
    if (error) return <div className="text-red-500">Error fetching last vote</div>

    const voteData = tiebreakVote ? data?.lastTiebreakVote : data?.lastVote

    if (!voteData) return <></>

    const hasAnySelection = Object.values(voteData).some(value => value && value.trim() !== '')

    if (!hasAnySelection) return <></>

    const renderSelection = (index: number, value: string) => {
        if (!value || value.trim() === '') return null
        return (
            <div key={index} className="grid grid-cols-3 gap-1 py-1 border-b last:border-b-0">
                <span className="font-medium">Selection {index + 1}:</span>
                <span>{value}</span>
                <span className="text-left text-gray-500">({5 - index} {index === 4 ? 'point' : 'points'})</span>
            </div>
        )
    }

    return (
        <Card className="w-full max-w-2xl md:max-w-full mx-auto">
            <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Your {tiebreakVote ? 'Tie-Break ' : ''}Vote</CardTitle>
                <CardDescription className="text-sm">
                    You have already voted. To change a selection, you can submit a vote again. Only the latest vote is being applied.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {expanded && (
                    <div className="space-y-2 mb-4">
                        {renderSelection(0, voteData.selection1)}
                        {renderSelection(1, voteData.selection2)}
                        {renderSelection(2, voteData.selection3)}
                        {renderSelection(3, voteData.selection4)}
                        {renderSelection(4, voteData.selection5)}
                    </div>
                )}
                <Button
                    variant="link"
                    onClick={() => setExpanded(!expanded)}
                    className="w-full text-center"
                >
                    {expanded ? 'Show less' : 'Show my latest vote'}
                </Button>
            </CardContent>
        </Card>
    )
}