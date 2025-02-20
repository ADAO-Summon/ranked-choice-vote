import React, { useState, useEffect, Component } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MailCheck, Download } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export async function getWorkshopRegistrationCodes(workshopId: string, count: number) {
  const response = await fetch('/api/admin/getRegistrationCodes', {
    method: 'POST',
    body: JSON.stringify({ workshopId, count }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch registration codes');
  }

  return response.json();
}

interface CustomTriggerProps {
  onClick: () => void;
}

interface RegistrationCodesDialogProps {
  workshopId: string;
  handleRequestCodes: (count: number) => Promise<any>;
  customTrigger?: React.ComponentType<CustomTriggerProps>;
}

const RegistrationCodesDialog: React.FC<RegistrationCodesDialogProps> = ({
  workshopId,
  handleRequestCodes,
  customTrigger: CustomTrigger
}) => {
  const [count, setCount] = useState(50);

  const { data: codes, isLoading, error, refetch } = useQuery({
    queryKey: ['registrationCodes', workshopId, count],
    queryFn: () => getWorkshopRegistrationCodes(workshopId, count),
    enabled: false,
  });

  useEffect(() => {
    refetch();
  }, [count, refetch]);

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/workshop/${workshopId}/downloadRegistrationCodes?count=${count}`, {
        method: 'GET',
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `registration_codes_${workshopId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {CustomTrigger ?
          <CustomTrigger onClick={() => { console.log("hello"); refetch() }} /> :
          <Button
            variant="outline"
            className="w-full sm:w-auto flex items-center justify-center gap-2"
            onClick={(e) => { refetch() }}
          >
            Show registration codes
          </Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-primary">Registration Codes</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-4 mb-4">
          <Select value={count.toString()} onValueChange={(value) => setCount(Number(value))}>
            <SelectTrigger className="w-[180px] text-secondary-foreground bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50 codes</SelectItem>
              <SelectItem value="100">100 codes</SelectItem>
              <SelectItem value="200">200 codes</SelectItem>
              <SelectItem value="500">500 codes</SelectItem>
              <SelectItem value="1000">1000 codes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <p className="text-primary">Loading...</p>
        ) : error ? (
          <p className="text-destructive">Error: {(error as Error).message}</p>
        ) : codes ? (
          <>
            <ScrollArea className="h-[300px] rounded-md border">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-primary w-1/2 sm:w-2/5">Code</TableHead>
                    <TableHead className="text-primary w-1/2 sm:w-3/5">Used By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code: any) => (
                    <TableRow key={code.code}>
                      <TableCell className="text-secondary-foreground font-medium break-all">{code.code}</TableCell>
                      <TableCell className="text-secondary-foreground break-words">{code.usedBy || 'Not used'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <div className="flex gap-4 mt-4">
              <Button onClick={() => {
                handleRequestCodes(count)
              }} className="flex-1 flex items-center justify-center gap-2">
                <MailCheck className="w-4 h-4" />
                Receive by email
              </Button>
              <Button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default RegistrationCodesDialog;