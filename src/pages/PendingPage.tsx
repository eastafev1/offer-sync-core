import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Clock, ShieldCheck, LogOut } from 'lucide-react';

export default function PendingPage() {
  const { signOut, profile } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(222,35%,14%)] to-[hsl(222,35%,8%)]">
      <div className="max-w-md w-full bg-card rounded-xl shadow-2xl border border-border p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center">
            <Clock className="w-9 h-9 text-warning" />
          </div>
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Awaiting Approval</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Hi <span className="font-medium text-foreground">{profile?.name}</span>, your account is pending admin review.
            You'll gain access once approved.
          </p>
        </div>
        <div className="bg-muted/60 rounded-lg p-4 text-xs text-muted-foreground space-y-1 text-left">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
            <span>An admin will review your application and assigned working countries.</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
            <span>You'll be notified via email once your account is activated.</span>
          </div>
        </div>
        <Button variant="outline" onClick={signOut} className="w-full gap-2">
          <LogOut className="w-4 h-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}
