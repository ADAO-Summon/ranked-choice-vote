import { Candidate, Workshop } from '@/types/votings';
import { Button } from '@/components/ui/button';
import CandidateSearch from './candidate-search';
import React, { useEffect, useState } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { useWalletContext } from '@/contexts/wallet-context';
import SelectedCandidatesList from './selected-candidates-list';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchLastVote } from '@/utils';
import WorkshopState from '@/lib/workshopState';
import { logError } from '@/utils/error-logs';
import { WorkshopDataRes } from '@/pages/api/workshop/data/[shortIdName]';

interface VotingCardProps {
    initialCandidates: Candidate[];
    workshop: WorkshopDataRes;
    isTiebreakVoting: boolean;
    tiebreakPlace?: number;
}

const VotingCard = ({ initialCandidates, workshop, isTiebreakVoting, tiebreakPlace }: VotingCardProps) => {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [selectedCandidates, setSelectedCandidates] = useState<Candidate[]>([]);
    const [mounted, setMounted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { lucid, walletApi } = useWalletContext();
    const queryClient = useQueryClient();

    console.log({ tiebreakPlace })

    const { data, isLoading, error } = useQuery({
        queryKey: ['lastVote', workshop.id],
        queryFn: () => fetchLastVote(workshop.id),
    })

    useEffect(() => {
        if (Array.isArray(initialCandidates) && initialCandidates.length > 0) {
            setCandidates([...initialCandidates].sort((a, b) => a.name.localeCompare(b.name)));
        } else {
            setCandidates([]);
        }
        setMounted(true);
    }, [initialCandidates]);

    const handleSelect = (candidate: Candidate) => {
        if (selectedCandidates.length < 5 && !selectedCandidates.some(selected => selected.name === candidate.name)) {
            setSelectedCandidates(prev => [...prev, candidate]);
        }
    };

    const handleRemove = (candidate: Candidate) => {
        setSelectedCandidates(prev => prev.filter(c => c.name !== candidate.name));
    };

    const onDragEnd = (result: any) => {
        if (!result.destination) return;
        const items = Array.from(selectedCandidates);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setSelectedCandidates(items);
    };

    const hasVoted = data?.lastVote && Object.values(data.lastVote).some(value => value && value.trim() !== '')
    const hasTiebreakVoted = data?.lastTiebreakVote && Object.values(data.lastTiebreakVote).some(value => value && value.trim() !== '')
    const hasVotedHere = ([WorkshopState.VoteFinalized, WorkshopState.VoteStarted, WorkshopState.VoteEnded].includes(workshop.status as any) && hasVoted) ||
        ([WorkshopState.TiebreakVoteFinalized, WorkshopState.TiebreakVoteStarted, WorkshopState.TiebreakVoteEnded].includes(workshop.status as any) && hasTiebreakVoted)

    const submitVote = async () => {
        //if (!walletApi) throw 'Web3Auth wallet is not available'

        const currentTime = (await (await fetch("/api/getCurrentDateTime")).json()).datetime
        const surveyJSON = JSON.stringify({
            params: selectedCandidates.map(c => c.id),
            timestamp: currentTime,
        })
        let vr: any = {}
        if (walletApi) {
            var stakeCredential = (await walletApi.getRewardAddresses())[0]

            const { signature, key } = await walletApi.signData(stakeCredential, Buffer.from(surveyJSON, 'ascii').toString('hex'))
            const stakeAddr = await lucid?.wallet.rewardAddress() as string
            const cardanoAddress = await lucid?.wallet.address() as string
            vr = {
                cose_key_hex: key,
                cose_signature_hex: signature,
                expected_message: surveyJSON,
                expected_address: stakeAddr,
                cardano_address: cardanoAddress,
                workshopId: workshop.id,
            }
        } else {
            vr = {
                cose_key_hex: null,
                cose_signature_hex: null,
                expected_message: surveyJSON,
                expected_address: null,
                cardano_address: null,
                workshopId: workshop.id,
            }

        }

        console.log({ vr })

        const createRes = await fetch(`/api/actions/submitVote`, {
            method: 'POST',
            body: JSON.stringify(vr),
        })

        const isSuccessful = createRes.status == 200
        if (isSuccessful) {
            setSelectedCandidates([])
            return createRes
        } else {
            const json = await createRes.json()
            throw json.message
        }
    }

    const submitMutation = useMutation({
        mutationFn: submitVote,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lastVote', workshop.id] });
            toast.success('Success', { description: 'Vote submitted successfully!' });
        },
        onError: (error) => {
            console.log({ error })
            toast.error('Something went wrong', {
                description: (error && typeof (error) === 'string') ? error : "An unexpected error occurred. Please try again"
            })
            logError(error)
        }
    })

    const onSubmit = async () => {
        setIsSubmitting(true)
        try {
            await submitMutation.mutateAsync()
        } catch (error) {
            console.error('Error submitting vote', error)
        }
        setIsSubmitting(false)
    }

    if (!mounted) return null;

    return (
        <Card className="mb-20">
            <CardHeader>
                <CardTitle>{isTiebreakVoting ? `Tiebreak Voting (Place ${tiebreakPlace})` : "Delegate Voting"}</CardTitle>
                <CardDescription>
                    {isTiebreakVoting ? (
                        <p>
                            Tiebreak Voting for Place {tiebreakPlace}: Select up to 5 candidates from the tied positions to break the tie.
                            Points will be awarded to each candidate based on the order in which you rank them.
                            This process may be repeated if further ties occur.
                        </p>
                    ) : (
                        <p>
                            Delegate Voting: Select up to 5 candidates.
                            Points will be awarded to each candidate based on the order in which you rank them.
                            The top ranked candidate will be recognized as the Committee Chair.
                        </p>
                    )}
                    <p className="mt-4">
                        You can drag and drop the candidates to change the order of your preference.
                    </p>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <CandidateSearch
                    candidates={candidates}
                    selectedCandidates={selectedCandidates}
                    onSelect={handleSelect}
                />
                <DragDropContext onDragEnd={onDragEnd}>
                    <SelectedCandidatesList
                        selectedCandidates={selectedCandidates}
                        onRemove={handleRemove}
                    />
                </DragDropContext>

                <div className="flex justify-end mt-4">
                    <Button disabled={!selectedCandidates || selectedCandidates.length < 1} onClick={onSubmit}>
                        {submitMutation.isPending ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            `${hasVotedHere ? 'Update' : 'Submit'} ${isTiebreakVoting ? 'Tiebreak' : ''} Vote`
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default VotingCard;