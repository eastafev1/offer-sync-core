import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { LogOut, User, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-purple-500/20 text-purple-200',
  seller: 'bg-blue-500/20 text-blue-200',
  agent: 'bg-green-500/20 text-green-200',
};

interface AppHeaderProps {
  activeCountry: string | null;
}

export function AppHeader({ activeCountry }: AppHeaderProps) {
  const { profile, primaryRole, signOut } = useAuth();

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-header border-b border-primary/20 flex-shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-header-foreground font-semibold text-sm">
          {activeCountry ? (
            <span className="flex items-center gap-2">
              <span className="text-header-foreground/60">Viewing:</span>
              <span className="font-bold">{activeCountry}</span>
            </span>
          ) : (
            <span className="text-header-foreground/60">All Countries</span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {primaryRole && (
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full capitalize', ROLE_BADGE[primaryRole])}>
            {primaryRole}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-header-foreground hover:bg-header-foreground/10 gap-2 h-8">
              <div className="w-6 h-6 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-header-foreground" />
              </div>
              <span className="text-sm font-medium max-w-32 truncate">{profile?.name ?? 'Account'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-header-foreground/70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium truncate">{profile?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive gap-2 cursor-pointer">
              <LogOut className="w-4 h-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
