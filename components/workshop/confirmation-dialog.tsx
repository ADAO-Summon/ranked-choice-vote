import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ConfirmationDialogProps {
    trigger: React.ReactNode;
    description: string;
    title?: string;
    confirmationButton: React.ReactNode;
    onConfirm: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    trigger,
    description,
    title = "Are you sure?",
    confirmationButton,
    onConfirm
}) => {
    const [open, setOpen] = React.useState(false);
    const handleConfirm = () => {
        onConfirm();
        setOpen(false);
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen} >
            <AlertDialogTrigger asChild>
                {trigger}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-secondary-foreground" >{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="text-secondary-foreground text-destructive border-destructive">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm} >
                        {confirmationButton}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default ConfirmationDialog;