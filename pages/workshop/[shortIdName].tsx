// pages/workshop/[id].tsx

import { useRouter } from 'next/router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { WorkshopWithCandidates, Candidate } from '@/types/votings'
import WorkshopStatusCard from '@/components/workshop/workshop-status-card'
import VotingCard from '@/components/workshop/voting/voting-card'
import AdminPanel from '@/components/workshop/admin-panel'
import { LastVote } from '@/components/last-vote'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import VoteResults from '@/components/workshop/voting/results'
import WorkshopState from '@/lib/workshopState'
import { useState, useEffect } from 'react'
import { WorkshopDataRes } from '../api/workshop/data/[shortIdName]'
import TiebreakRoundState from '@/lib/tiebreakRoundState'
import { Participant } from '@/components/workshop/participant-dialog'

const fetchWorkshop = async (shortIdName: string): Promise<WorkshopDataRes> => {
    console.log("fetching workshop")
    const res = await fetch(`/api/workshop/data/${shortIdName}`)
    if (!res.ok) throw new Error('Failed to fetch workshop data')
    return res.json()
}

interface TiebreakCandidatesResponse {
  tbfplace: number;
  candidates: string[];
}

const fetchTiebreakCandidates = async (workshopId: string): Promise<TiebreakCandidatesResponse> => {
    const res = await fetch(`/api/workshop/${workshopId}/tiebreakCandidates`)
    if (!res.ok) throw new Error('Failed to fetch tiebreak candidates')
    return res.json()
}

export const performAction = async ({ action, workshopId }: { action: string; workshopId: string }) => {
    let url = '/api/admin/'
    if (action === 'requestRegistrationCodes') {
        url = '/api/'
    }
    const res = await fetch(`${url}${action}`, {
        method: 'POST',
        body: JSON.stringify({ workshopId }),
    })
    if (!res.ok) throw new Error('Action failed')
    return res.json()
}

export const performActionWithCount = async ({ action, workshopId, count }: { action: string; workshopId: string, count: number }) => {
    let url = '/api/admin/'
    if (action === 'requestRegistrationCodes') {
        url = '/api/'
    }
    const res = await fetch(`${url}${action}`, {
        method: 'POST',
        body: JSON.stringify({ workshopId, count }),
    })
    if (!res.ok) throw new Error('Action failed')
    return res.json()
}

export default function WorkshopPage() {
    const router = useRouter()
    const { shortIdName } = router.query
    const queryClient = useQueryClient()
    const [tiebreakCandidates, setTiebreakCandidates] = useState<Candidate[]>([]);

    
    const { data: workshop, error, isLoading } = useQuery<WorkshopDataRes, Error>({
        queryKey: ['workshop', shortIdName],
        queryFn: () => fetchWorkshop(shortIdName as string),
        refetchInterval: 30000,
        enabled: !!shortIdName,
    });

    const { data: participants, isLoading: isLoadingParticipants, isFetching: isFetchingParticipants, refetch: refetchParticipants } = useQuery<Participant[]>({
        queryKey: ['participants', workshop?.id],
        queryFn: () => fetch(`/api/admin/getRegistrations`, {
          method: 'POST',
          body: JSON.stringify({ workshopId:workshop?.id })
        }).then(res => res.json()),
        refetchOnWindowFocus: false,
        enabled: !!workshop
      });

    useEffect(() => {
        if (workshop && workshop.status === WorkshopState.TiebreakVoteStarted) {
            const currentTiebreakRound = workshop.TiebreakRound.find(round => round.status !== TiebreakRoundState.Finalized);
            if (currentTiebreakRound) {
                setTiebreakCandidates(currentTiebreakRound.candidates.map(name => ({
                    id: name,
                    name: name,
                    userId: '' // You might need to adjust this if you have a userId for tiebreak candidates
                })));
            }
        }
    }, [workshop]);

    console.log({participants})
    const isVotingActive = (workshop: WorkshopDataRes) => {
        if (workshop.status === WorkshopState.VoteStarted) {
            return true;
        }
        if (workshop.status === WorkshopState.TiebreakVoteStarted) {
            const currentTiebreakRound = workshop.TiebreakRound.find(round => round.status !== TiebreakRoundState.Finalized);
            return currentTiebreakRound && currentTiebreakRound.status === TiebreakRoundState.Started;
        }
        return false;
    };

    const actionMutation = useMutation({
        mutationFn: performAction,
        onSuccess: (action) => {
            queryClient.invalidateQueries({ queryKey: ['workshop', shortIdName] })
            toast.success("Success", {description: action.message})
        },
    })

    const actionWithCountMutation = useMutation({
        mutationFn: performActionWithCount,
        onSuccess: (action) => {
            console.log({action})
            queryClient.invalidateQueries({ queryKey: ['workshop', shortIdName] })
            toast.success("Success", {description: action.message})
        },
        onError: (error) => {
            toast.error("Error", {
                description: "Failed to perform action. " + error.message,
            })
        },
    })

    

    const handleAction = (action: string, count = 0) => {
        if (workshop) {
            if (count)
                actionWithCountMutation.mutate({ action, workshopId: workshop.id, count: count})
            else
                actionMutation.mutate({ action, workshopId: workshop.id })
        }
    }

    const { TiebreakVoteFinalized, VoteFinalized } = WorkshopState

    if (isLoading) return <Skeleton className="w-full h-96" />

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
            </Alert>
        )
    }

    // const isActive = workshop?.status === WorkshopState.VoteStarted || workshop?.status === WorkshopState.TiebreakVoteStarted
    const votingActive = workshop ? isVotingActive(workshop) : false;
    const currentTiebreakRound = workshop?.TiebreakRound.find(round => round.status !== TiebreakRoundState.Finalized);

    return (
        <div className="container mx-auto p-4">
            <Button size="icon" variant="link" onClick={() => router.push("/")} className="mb-4"><ArrowLeft className="text-primary-foreground" /></Button>
            <h1 className="text-2xl font-bold mb-4">{workshop?.readableName}</h1>
            {workshop?.isAdmin && <>
                <AdminPanel workshop={workshop} handleAction={handleAction} actionMutation={actionMutation} />
            </>}

            <div className="flex flex-col gap-4">
                <WorkshopStatusCard key={`status-card-${workshop?.candidates.length ?? 0}`} workshop={workshop} participantAmount={participants?.length} />

                {(workshop && votingActive) && <>
                    <LastVote 
                        key={workshop.candidates.map(c => c.userId).join(",")} 
                        tiebreakVote={workshop?.status === WorkshopState.TiebreakVoteStarted} 
                        workshopId={workshop.id} 
                    />
                    <VotingCard 
                        initialCandidates={
                            workshop.status === WorkshopState.TiebreakVoteStarted
                                ? tiebreakCandidates
                                : workshop.candidates.map(c => ({
                                    id: c.name,
                                    name: c.name,
                                    userId: c.userId
                                }))
                        } 
                        workshop={workshop}
                        isTiebreakVoting={workshop.status === WorkshopState.TiebreakVoteStarted}
                        tiebreakPlace={currentTiebreakRound?.tbfplace}
                    />
                </>}
                {(workshop && workshop.status >= WorkshopState.VoteFinalized) &&
                    <VoteResults workshop={workshop} />}
            </div>
            {actionMutation.isError && (
                <Alert variant="destructive" className="mt-4">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{actionMutation.error.message}</AlertDescription>
                </Alert>
            )}
        </div>
    )
}