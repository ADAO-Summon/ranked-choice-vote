import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "../ui/button"
import { Workshop } from "@/types/votings"
import EditWorkshopDialog from "./edit-workshop-dialog"
import { ChevronDownIcon } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Link from "next/link"
import { exportVotesToCSV } from "@/utils/exportVotes"
import RegistrationCodesDialog from "../registration-codes-dialog"
import { performAction, performActionWithCount } from "@/pages/workshop/[shortIdName]"

export default function ActionsMenu({ workshop }: { workshop: Workshop }) {
    const queryClient = useQueryClient()
    const actionMutation = useMutation({
        mutationFn: performAction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workshop', workshop.shortIdName] })
        },
    })

    const actionWithCountMutation = useMutation({
        mutationFn: performActionWithCount,
        onSuccess: (action) => {
            queryClient.invalidateQueries({ queryKey: ['workshop', workshop.shortIdName] })
            toast("Success", {
                description: action.message,
            })
        },
    })


    const handleAction = (action: string, count = 0) => {
        if (workshop) {
            if (count)
                actionWithCountMutation.mutate({ action, workshopId: workshop.id, count: count })
            else
                actionMutation.mutate({ action, workshopId: workshop.id })
        }
    }

    const requestRegistrationCodes = async (workshopId: string) => {
        const res = await fetch('/api/requestRegistrationCodes', {
            method: 'POST',
            body: JSON.stringify({ workshopId }),
        })
        if (!res.ok) throw new Error('Failed to request registration codes')
        return res.json()
    }
    const requestCodesMutation = useMutation({
        mutationFn: requestRegistrationCodes,
        onSuccess: () => {
            toast("Success", {
                description: "Registration codes have been emailed.",
            })
        },
        onError: (error) => {
            toast("Error", {
                description: "Failed to email registration codes. " + error.message,
            })
        },
    })

    const handleExport = async (tiebreak = false) => {
        if (!workshop) throw 'Workshop not loaded yet'
        try {
            await exportVotesToCSV(workshop.id, workshop.shortIdName as string, tiebreak);
        } catch (error) {
            toast.error('Failed to export votes:', { description: error!.toString() });
        }
    };
    return (
        <DropdownMenu  >
            <DropdownMenuTrigger >
                <Button variant="link" size="icon"><ChevronDownIcon /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-background/80">
                <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={(e)=>e.preventDefault()} >
                        <EditWorkshopDialog workshop={workshop} />
                    </DropdownMenuItem>
                    {/*  <DropdownMenuItem  >
                        <Button
                            variant="ghost"
                            onClick={() => requestCodesMutation.mutate(workshop.id)}
                            disabled={requestCodesMutation.isPending}
                        >
                            {requestCodesMutation.isPending ? 'Sending...' : 'Receive registration codes'}
                        </Button>
                    </DropdownMenuItem> */}
                    <DropdownMenuItem  >
                        <Link className="px-4 py-2 font-medium" href={`/workshop/${workshop.shortIdName}`}>
                            Go to workshop
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <Button variant="ghost" onClick={() => handleExport(false)} >Download votes</Button>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <Button variant={"ghost"} onClick={() => handleExport(true)} >Download tiebreak votes</Button>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} >
                        <RegistrationCodesDialog customTrigger={({onClick}) =>
                            <Button onClick={onClick}  className="w-full" variant="ghost" >
                                Show registration codes
                            </Button>
                        } workshopId={workshop.id} handleRequestCodes={async (count = 0) => handleAction('requestRegistrationCodes', count)} />
                    </DropdownMenuItem>

                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )

}