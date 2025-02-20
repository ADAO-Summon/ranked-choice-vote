import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserWorkshop } from '@/types/votings';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getStatusColor } from '@/utils';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/router';
import { getWorkshopStatusName, WorkshopStateDisplayNames, WorkshopStatus } from '@/lib/workshopState';
import Link from 'next/link';
import { ScrollArea } from '@radix-ui/react-scroll-area';

const StatusBadge = ({ status }: { status: UserWorkshop['status'] }) => {
    const [color, hoverColor] = getStatusColor(status);
    return (
        <Badge
            style={{
                backgroundColor: color,
                '--hover-bg': hoverColor,
            } as React.CSSProperties}
            className="text-white transition-colors hover:bg-[var(--hover-bg)]"
        >
            {getWorkshopStatusName(status)}
        </Badge>
    );
}
const WorkshopList = ({ workshops }: { workshops: UserWorkshop[] }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const router = useRouter();

    const filteredWorkshops = workshops.filter(workshop =>
        (workshop.readableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            workshop.shortIdName.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (statusFilter === 'all' || workshop.status === Number(statusFilter))
    );

    const handleWorkshopClick = (shortIdName: string) => {
        router.push(`/workshop/${shortIdName}`);
    };

    console.log(workshops);
    return (
        <div className="mx-auto">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Workshops</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex space-x-4 mb-4">
                        <Input
                            placeholder="Search by name or short ID"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                        <Select onValueChange={setStatusFilter} defaultValue="all">
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem key="all" value="all">All Statuses</SelectItem>
                                {Object.keys(WorkshopStateDisplayNames).map((s) => {
                                    return <SelectItem key={s} value={s}>{WorkshopStateDisplayNames[Number(s) as WorkshopStatus]}</SelectItem>
                                })}
                                {/* <SelectItem value="0">Not Started</SelectItem>
                                <SelectItem value="1">Registration Started</SelectItem>
                                <SelectItem value="2">Registration Ended</SelectItem>
                                <SelectItem value="3"></SelectItem>
                                <SelectItem value="4">In Progress</SelectItem>
                                <SelectItem value="5">Voted</SelectItem>
                                <SelectItem value="6">Test Vote</SelectItem>
                                <SelectItem value="7">Test Vote</SelectItem>
                                <SelectItem value="8">Test Vote</SelectItem>
                                <SelectItem value="test_vote">Test Vote</SelectItem>
                                <SelectItem value="test_vote">Test Vote</SelectItem> */}
                            </SelectContent>
                        </Select>
                    </div>
                        <Table className="" >
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Short ID</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {filteredWorkshops.map((workshop) => (
                                    <TableRow key={workshop.id}>
                                        <TableCell><Link className="text-primary hover:text-primary/80 underline underline-offset-4" href={`/workshop/${workshop.shortIdName}`} >{workshop.readableName}</Link></TableCell>
                                        <TableCell>{workshop.shortIdName}</TableCell>
                                        <TableCell>
                                            <StatusBadge status={workshop.status} />
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="link" onClick={() => handleWorkshopClick(workshop.shortIdName)}>
                                                View Workshop
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>

                        </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default WorkshopList;