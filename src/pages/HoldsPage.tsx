import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Clock, ShoppingCart, X, Timer, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SellOrderDialog } from '@/components/SellOrderDialog';

interface Hold {
  id: string;
  product_id: string;
  status: string;
  expires_at: string;
  extended: boolean;
  created_at: string;
  products: { title: string; main_image_url: string | null; commission_eur: number } | null;
}

function Countdown({ expiresAt, onExpired }: { expiresAt: string; onExpired: () => void }) {
  const [remaining, setRemaining] = useState(0);
  const [called, setCalled] = useState(false);

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setRemaining(diff);
      if (diff === 0 && !called) {
        setCalled(true);
        onExpired();
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const urgent = remaining < 60000 && remaining > 0;
  const expired = remaining === 0;

  if (expired) return <span className="text-xs text-muted-foreground">Expired</span>;
  return (
    <span className={cn('font-mono text-sm font-bold tabular-nums', urgent ? 'text-destructive animate-pulse' : 'text-foreground')}>
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  );
}

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-active',
  expired: 'badge-expired',
  converted: 'badge-converted',
  cancelled: 'badge-cancelled',
};

export default function HoldsPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [holds, setHolds] = useState<Hold[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellHold, setSellHold] = useState<Hold | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);

  const fetchHolds = useCallback(async () => {
    let q = supabase
      .from('holds')
      .select('*, products(title, main_image_url, commission_eur)')
      .order('created_at', { ascending: false });
    if (!isAdmin) q = q.eq('agent_id', user!.id);
    const { data } = await q;
    setHolds((data ?? []) as Hold[]);
    setLoading(false);
  }, [user, isAdmin]);

  useEffect(() => { fetchHolds(); }, [fetchHolds]);

  async function handleExtend(hold: Hold) {
    setActioning(hold.id);
    try {
      const { error } = await supabase.rpc('extend_hold', { p_hold_id: hold.id, p_agent_id: user!.id });
      if (error) throw error;
      toast({ title: 'Hold extended by 5 minutes!' });
      fetchHolds();
    } catch (err: any) {
      toast({ title: 'Cannot extend', description: err.message, variant: 'destructive' });
    } finally {
      setActioning(null);
    }
  }

  async function handleCancel(holdId: string) {
    setActioning(holdId);
    try {
      const { error } = await supabase.from('holds').update({ status: 'cancelled' }).eq('id', holdId);
      if (error) throw error;
      toast({ title: 'Hold cancelled' });
      fetchHolds();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActioning(null);
    }
  }

  const canExtend = (hold: Hold) => {
    if (hold.status !== 'active') return false;
    if (hold.extended) return false;
    const remaining = new Date(hold.expires_at).getTime() - Date.now();
    return remaining > 0 && remaining < 60000;
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Holds / Bookings</h1>
        <p className="text-sm text-muted-foreground">Your active and past product reservations</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : holds.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No holds yet. Reserve a product to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {holds.map((hold) => (
            <div
              key={hold.id}
              className={cn(
                'bg-card border rounded-xl p-4 flex items-center gap-4 flex-wrap transition-all',
                hold.status === 'active' ? 'border-primary/30' : 'border-border'
              )}
            >
              {/* Image */}
              {hold.products?.main_image_url ? (
                <img src={hold.products.main_image_url} alt="" className="w-12 h-12 object-contain rounded border border-border bg-white flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 bg-muted rounded border border-border flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{hold.products?.title ?? 'Product'}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className={STATUS_BADGE[hold.status] ?? 'badge-expired'}>{hold.status}</span>
                  {hold.products?.commission_eur && (
                    <span className="text-xs text-success font-medium">€{hold.products.commission_eur.toFixed(2)} comm.</span>
                  )}
                </div>
              </div>

              {/* Countdown */}
              {hold.status === 'active' && (
                <div className="flex flex-col items-center gap-0.5">
                  <Countdown
                    expiresAt={hold.expires_at}
                    onExpired={fetchHolds}
                  />
                  <span className="text-xs text-muted-foreground">remaining</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {hold.status === 'active' && (
                  <>
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => setSellHold(hold)}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" /> Sell / Insert Order
                    </Button>
                    {canExtend(hold) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs border-warning text-warning hover:bg-warning/10"
                        disabled={actioning === hold.id}
                        onClick={() => handleExtend(hold)}
                      >
                        <Timer className="w-3.5 h-3.5" /> +5 min
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs border-destructive text-destructive hover:bg-destructive/10"
                      disabled={actioning === hold.id}
                      onClick={() => handleCancel(hold.id)}
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sell Dialog */}
      {sellHold && (
        <SellOrderDialog
          hold={sellHold}
          onClose={() => setSellHold(null)}
          onSuccess={() => { setSellHold(null); fetchHolds(); }}
        />
      )}
    </div>
  );
}
