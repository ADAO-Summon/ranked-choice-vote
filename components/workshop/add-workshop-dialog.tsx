import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '../ui/button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Input } from '../ui/input'
import { Loader2, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export default function AddWorkshopDialog() {
    const [isAddWorkshopOpen, setIsAddWorkshopOpen] = useState(false)
    const [date, setDate] = useState<Date | undefined>()
    const queryClient = useQueryClient()

    const addWorkshop = async (data: { name: string; adminEmail: string, secondaryAdminEmail?: string, scheduledFor: Date }) => {
        const res = await fetch('/api/manager/addWorkshop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Failed to add workshop')
        return res.json()
    }

    const addWorkshopMutation = useMutation({
        mutationFn: addWorkshop,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workshops'] })
            toast.success('Workshop added')
            setIsAddWorkshopOpen(false)
            setDate(undefined)
        },
        onError: () => {
            toast.error('Failed to add workshop')
        }
    })

    return (
        <Dialog open={isAddWorkshopOpen} onOpenChange={setIsAddWorkshopOpen}>
            <DialogTrigger asChild>
                <Button>Add New Workshop</Button>
            </DialogTrigger>
            <DialogContent className="bg-white" >
                <DialogHeader>
                    <DialogTitle>Add New Workshop</DialogTitle>
                </DialogHeader>
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        const formData = new FormData(e.currentTarget)
                        const name = formData.get('name') as string
                        const adminEmail = formData.get('adminEmail') as string
                        const secondaryAdminEmail = formData.get('secondaryAdminEmail') as string | undefined

                        if (!date) {
                            toast.error('Please select a scheduled date')
                            return
                        }

                        addWorkshopMutation.mutate({
                            name,
                            adminEmail,
                            secondaryAdminEmail,
                            scheduledFor: date
                        })
                    }}
                >
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                Workshop Name
                            </label>
                            <Input
                                type="text"
                                name="name"
                                id="name"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">
                                Organizer Email
                            </label>
                            <Input
                                type="email"
                                name="adminEmail"
                                id="adminEmail"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="secondaryAdminEmail" className="block text-sm font-medium text-gray-700">
                                Secondary Organizer Email
                            </label>
                            <Input
                                type="email"
                                name="secondaryAdminEmail"
                                id="secondaryAdminEmail"
                            />
                        </div>
                        <div>
                            <label htmlFor="scheduledFor" className="block text-sm font-medium text-gray-700">
                                Scheduled Date
                            </label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={`w-full text-secondary-foreground justify-start text-left font-normal ${!date && "text-muted-foreground"}`}
                                    >
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <CalendarComponent
                                        mode="single"
                                        selected={date}
                                        onSelect={(d) => setDate(d)}
                                        disabled={(date:any) => date < new Date()}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <Button disabled={addWorkshopMutation.isPending} type="submit">
                            {addWorkshopMutation.isPending ? <Loader2 className="animate-spin" /> : 'Create Workshop'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}