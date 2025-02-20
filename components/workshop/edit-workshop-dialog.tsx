import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '../ui/button'
import { Workshop } from '@/types/votings'
import { Input } from '../ui/input'
import { useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export default function EditWorkshopDialog({ workshop }: { workshop: Workshop }) {
    const queryClient = useQueryClient()
    const closeRef = useRef<any>(null)

    const updateWorkshop = async (data: Partial<Workshop>) => {
        const res = await fetch('/api/manager/workshops', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Failed to update workshop')
        return res.json()
    }

    const updateWorkshopMutation = useMutation({
        mutationFn: updateWorkshop,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workshops'] })
            toast.success('Workshop updated')
            closeRef.current?.click()
        },
        onError: () => {
            toast.error('Failed to update workshop')
        }
    })

    async function onSubmitEdit(e: any, workshop: Workshop) {
        const formData = new FormData(e.currentTarget)
        updateWorkshopMutation.mutate({
            id: workshop.id,
            readableName: formData.get('readableName') as string,
            adminEmail: formData.get('adminEmail') as string,
            secondaryAdminEmail: formData.get('secondaryAdminEmail') as string,
        })
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className="w-full justify-start" variant="ghost">Edit</Button>
            </DialogTrigger>
            <DialogContent className="bg-white" >
                <DialogHeader>
                    <DialogTitle>Edit Workshop</DialogTitle>
                </DialogHeader>
                <form
                    onSubmit={(e) => {
                        console.log("hey")
                        e.preventDefault()
                        onSubmitEdit(e, workshop)
                    }}
                >
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="readableName" className="block text-sm font-medium text-gray-700">
                                Workshop Name
                            </label>
                            <Input
                                type="text"
                                name="readableName"
                                id="readableName"
                                defaultValue={workshop.readableName}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">
                                Admin Email
                            </label>
                            <Input
                                type="email"
                                name="adminEmail"
                                id="adminEmail"
                                defaultValue={workshop.adminEmail}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="secondaryAminEmail" className="block text-sm font-medium text-gray-700">
                                Secondary Admin Email
                            </label>
                            <Input
                                type="email"
                                name="secondaryAdminEmail"
                                id="secondaryAdminEmail"
                                defaultValue={workshop.secondaryAdminEmail}
                                required
                            />
                        </div>
                        <Button type="submit">{updateWorkshopMutation.isPending ? <Loader2 className="animate-spin" /> : "Save Changes"}</Button>
                    </div>
                </form >
                <DialogClose asChild >
                    <Button className="hidden" ref={closeRef} variant="ghost" />
                </DialogClose>
            </DialogContent>
        </Dialog>
    )
}