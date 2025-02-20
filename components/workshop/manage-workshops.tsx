import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import WorkshopState, { getWorkshopStatusName } from '@/lib/workshopState'
import { Loader2 } from 'lucide-react'
import { Workshop } from '@/types/votings'
import EditWorkshopDialog from './edit-workshop-dialog'
import AddWorkshopDialog from './add-workshop-dialog'
import ActionsMenu from './actions-menu'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Card, CardContent } from '../ui/card'


const fetchWorkshops = async (): Promise<Workshop[]> => {
  const res = await fetch('/api/manager/workshops')
  if (!res.ok) throw new Error('Failed to fetch workshops')
  return res.json()
}

export function ManageWorkshops() {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [searchTerm, setSearchTerm] = useState('')
  const { data: workshops, isLoading: workshopsLoading } = useQuery<Workshop[]>({
    queryKey: ['workshops'],
    queryFn: fetchWorkshops,
  })

  if (workshopsLoading) return <div>Loading...</div>

  const filteredAndSortedWorkshops = workshops
    ?.filter(workshop =>
      workshop.readableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workshop.shortIdName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workshop.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workshop.secondaryAdminEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = parseISO(a.scheduledFor ?? '')
      const dateB = parseISO(b.scheduledFor ?? '')
      return sortOrder === 'asc'
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime()
    })

  return (
    <div>
      <div className="mb-4">
        <AddWorkshopDialog />
      </div>
      <Input onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search" className="my-4" />
      <Card className="my-2" >
        <CardContent>
          <Table className='' >
            <TableHeader className=""  >
              <TableRow >
                <TableHead className='font-bold'>Name</TableHead>
                <TableHead className='font-bold'>Short ID</TableHead>
                <TableHead className='font-bold'>Admin Email</TableHead>
                <TableHead className='font-bold'>Secondary Admin Email</TableHead>
                <TableHead className='font-bold'>Status</TableHead>
                <TableHead className='font-bold'>Date</TableHead>
                <TableHead className='font-bold'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedWorkshops?.map((workshop) => (
                <TableRow key={workshop.id}>
                  <TableCell><Link href={`/workshop/${workshop.shortIdName}`} >{workshop.readableName}</Link></TableCell>
                  <TableCell>{workshop.shortIdName}</TableCell>
                  <TableCell>{workshop.adminEmail}</TableCell>
                  <TableCell>{workshop.secondaryAdminEmail}</TableCell>
                  <TableCell>
                    {getWorkshopStatusName(workshop.status)}
                  </TableCell>
                  <TableCell>
                    {workshop.scheduledFor ? format(new Date(workshop.scheduledFor), 'MMM dd yyyy')  : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="space-x-2">
                      <ActionsMenu workshop={workshop} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}