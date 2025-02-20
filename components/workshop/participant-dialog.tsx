import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, RefreshCwIcon, X } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

export interface Participant {
  registrationId: string
  candidateName?: string;
  userId: string;
  candidate: boolean;
  email: string
}

interface ParticipantDialogProps {
  workshopId: string;
  viewOnly: boolean;
}

export default function ParticipantDialog({ workshopId, viewOnly }: ParticipantDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [candidateNames, setCandidateNames] = useState<{ [key: string]: string }>({});
  const [candidateStatuses, setCandidateStatuses] = useState<{ [key: string]: boolean }>({});
  const queryClient = useQueryClient();

  const { data: participants, isLoading: isLoadingParticipants, isFetching: isFetchingParticipants, refetch: refetchParticipants } = useQuery<Participant[]>({
    queryKey: ['participants', workshopId],
    queryFn: () => fetch(`/api/admin/getRegistrations`, {
      method: 'POST',
      body: JSON.stringify({ workshopId })
    }).then(res => res.json()),
    refetchOnWindowFocus: false,
  });

  const updateParticipantMutation = useMutation({
    mutationFn: (updateData: { registrationId: string; candidate: boolean | null; candidateName: string | null }) =>
      fetch('/api/admin/changeRegistration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants', workshopId] });
    },
  });

  const filteredParticipants = participants ? participants.filter(participant =>
    participant.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const handleCandidateUpdate = (participant: Participant) => {
    const newCandidateName = candidateNames[participant.registrationId] || null;
    const newCandidateStatus = candidateStatuses.hasOwnProperty(participant.registrationId)
      ? candidateStatuses[participant.registrationId]
      : participant.candidate;

    updateParticipantMutation.mutate({
      registrationId: participant.registrationId,
      candidate: newCandidateStatus !== participant.candidate ? newCandidateStatus : null,
      candidateName: newCandidateName !== participant.candidateName ? newCandidateName : null,
    });
  };

  const handleCandidateNameChange = (registrationId: string, name: string) => {
    setCandidateNames(prev => ({ ...prev, [registrationId]: name }));
  };

  const handleCandidateStatusChange = (registrationId: string, checked: boolean) => {
    setCandidateStatuses(prev => ({ ...prev, [registrationId]: checked }));
  };

  return (
    <Dialog onOpenChange={(open)=>{if(open)refetchParticipants()}}>
      <DialogTrigger asChild>
        <Button variant="outline">View participants</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px] bg-white">
        <DialogHeader>
          <DialogTitle>Participants</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="flex flex-row space-x-2 w-full">
            <Input
              placeholder="Search by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />
            <Button size="icon" variant="outline" onClick={() => refetchParticipants()} disabled={updateParticipantMutation.isPending}>
              {(isLoadingParticipants || isFetchingParticipants) ? <Loader2 className='w-2 h-2 text-sm animate-spin' /> : <RefreshCwIcon className="w-4 h-4 text-black" />}
            </Button>
          </div>
          <ScrollArea className="h-[300px] rounded-md border">
            <Table className="text-secondary-foreground w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Email</TableHead>
                  <TableHead className="w-[20%]">Candidate</TableHead>
                  <TableHead className="w-[40%]">Candidate Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.map((participant) => (
                  <TableRow key={participant.email}>
                    <TableCell className="font-medium break-all">{participant.email}</TableCell>
                    <TableCell>
                      {participant.candidate ?
                        <Check className="w-4 h-4 text-green-500" /> :
                        <X className="w-4 h-4 text-red-500" />
                      }
                    </TableCell>
                    <TableCell className="break-all">{participant.candidateName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}