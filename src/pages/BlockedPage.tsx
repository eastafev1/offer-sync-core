import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ShieldX, LogOut } from 'lucide-react';

export default function BlockedPage() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(222,35%,14%)] to-[hsl(222,35%,8%)]">
      <div className="max-w-md w-full bg-card rounded-xl shadow-2xl border border-border p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <ShieldX className="w-9 h-9 text-destructive" />
          </div>
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Account Suspended</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Your account has been blocked. Please contact an administrator for more information.
          </p>
        </div>
        <Button variant="outline" onClick={signOut} className="w-full gap-2">
          <LogOut className="w-4 h-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}
