import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

const addManager = async (email: string) => {
  const res = await fetch('/api/manager/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Failed to add manager')
  }
  return res.json()
}

export function AddManager() {
  const [email, setEmail] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()

  const addManagerMutation = useMutation({
    mutationFn: addManager,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] })
      setEmail('')
      setIsOpen(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addManagerMutation.mutate(email)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Add New Manager</Button>
      </DialogTrigger>
      <DialogContent className="bg-white" >
        <DialogHeader>
          <DialogTitle>Add New Manager</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Manager Email
            </label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={addManagerMutation.isPending}>
            {addManagerMutation.isPending ? 'Adding...' : 'Add Manager'}
          </Button>
          {addManagerMutation.isError && (
            <p className="text-red-500">{addManagerMutation.error.message}</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}