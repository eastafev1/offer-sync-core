import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Globe } from 'lucide-react';

const COUNTRIES = ['ES', 'DE', 'FR', 'IT', 'UK'] as const;

interface UserRow {
  id: string;
  name: string;
  email: string;
  status: string;
  telegram_username: string | null;
  created_at: string;
  roles: string[];
  countries: string[];
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-pending',
  approved: 'badge-approved',
  blocked: 'badge-blocked',
};

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    const { data: countries } = await supabase.from('user_countries').select('user_id, country');

    const merged: UserRow[] = (profiles ?? []).map((p) => ({
      ...p,
      roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
      countries: (countries ?? []).filter((c) => c.user_id === p.id).map((c) => c.country),
    }));
    setUsers(merged);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function setStatus(userId: string, status: 'approved' | 'blocked') {
    setActioning(userId);
    const { error } = await supabase.from('profiles').update({ status }).eq('id', userId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: `User ${status}` }); fetchUsers(); }
    setActioning(null);
  }

  async function toggleCountry(userId: string, country: string, has: boolean) {
    if (has) {
      await supabase.from('user_countries').delete().eq('user_id', userId).eq('country', country as 'ES' | 'DE' | 'FR' | 'IT' | 'UK');
    } else {
      await supabase.from('user_countries').insert({ user_id: userId, country: country as 'ES' | 'DE' | 'FR' | 'IT' | 'UK' });
    }
    fetchUsers();
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
        <p className="text-sm text-muted-foreground">{users.length} registered users</p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Countries</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (<td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>))}</tr>
                ))
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                    {u.telegram_username && <p className="text-xs text-muted-foreground">{u.telegram_username}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {u.roles.map((r) => (
                      <span key={r} className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded mr-1">{r}</span>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={STATUS_BADGE[u.status] ?? 'badge-pending'}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {COUNTRIES.map((c) => {
                        const has = u.countries.includes(c);
                        return (
                          <button
                            key={c}
                            onClick={() => toggleCountry(u.id, c, has)}
                            className={`text-xs px-2 py-0.5 rounded border transition-colors ${has ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary'}`}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {u.status !== 'approved' && (
                        <Button size="sm" className="h-7 px-2 gap-1 text-xs" disabled={actioning === u.id} onClick={() => setStatus(u.id, 'approved')}>
                          <CheckCircle2 className="w-3 h-3" /> Approve
                        </Button>
                      )}
                      {u.status !== 'blocked' && (
                        <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs border-destructive text-destructive hover:bg-destructive/10" disabled={actioning === u.id} onClick={() => setStatus(u.id, 'blocked')}>
                          <XCircle className="w-3 h-3" /> Block
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
