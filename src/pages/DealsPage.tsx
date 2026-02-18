import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Loader2, Eye, CheckCircle2, XCircle } from 'lucide-react';

interface Deal {
  id: string;
  product_id: string;
  agent_id: string;
  status: string;
  amazon_profile_url: string | null;
  customer_name: string | null;
  customer_paypal: string | null;
  customer_telegram: string | null;
  order_screenshot_path: string | null;
  review_link: string | null;
  review_screenshot_path: string | null;
  commission_eur: number | null;
  admin_note: string | null;
  created_at: string;
  products: { title: string; marketplace_country: string | null } | null;
  profiles?: { name: string; email: string } | null;
}

const STATUS_BADGE: Record<string, string> = {
  sold_submitted: 'badge-pending',
  review_uploaded: 'badge-converted',
  approved: 'badge-active',
  rejected: 'badge-cancelled',
  paid_to_client: 'badge-converted',
  completed: 'badge-active',
};

const STATUS_LABELS: Record<string, string> = {
  sold_submitted: 'Submitted',
  review_uploaded: 'Review Uploaded',
  approved: 'Approved',
  rejected: 'Rejected',
  paid_to_client: 'Paid to Client',
  completed: 'Completed',
};

const ADMIN_NEXT_STATUS: Record<string, string | null> = {
  sold_submitted: 'review_uploaded',
  review_uploaded: 'approved',
  approved: 'paid_to_client',
  paid_to_client: 'completed',
  completed: null,
  rejected: null,
};

export default function DealsPage() {
  const { isAdmin, isSeller, user } = useAuth();
  const { toast } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewDeal, setReviewDeal] = useState<Deal | null>(null);
  const [advancing, setAdvancing] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    let q = supabase
      .from('deals')
      .select('*, products(title, marketplace_country)')
      .order('created_at', { ascending: false });

    if (!isAdmin) q = q.eq('agent_id', user!.id);
    type DealStatus = 'approved' | 'completed' | 'paid_to_client' | 'rejected' | 'review_uploaded' | 'sold_submitted';
    if (statusFilter !== 'all') q = q.eq('status', statusFilter as DealStatus);

    const { data } = await q;
    setDeals((data ?? []) as unknown as Deal[]);
    setLoading(false);
  }, [isAdmin, user, statusFilter]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  async function handleAdvanceStatus(deal: Deal) {
    const nextStatus = ADMIN_NEXT_STATUS[deal.status];
    if (!nextStatus) return;
    setAdvancing(deal.id);
    try {
      const { error } = await supabase.from('deals').update({ status: nextStatus as 'approved' | 'completed' | 'paid_to_client' | 'rejected' | 'review_uploaded' | 'sold_submitted' }).eq('id', deal.id);
      if (error) throw error;

      // Create commission credit when completed
      if (nextStatus === 'completed') {
        await supabase.from('commission_credits').insert({
          deal_id: deal.id,
          agent_id: deal.agent_id,
          product_id: deal.product_id,
          amount_eur: deal.commission_eur ?? 0,
        });
      }

      toast({ title: `Status → ${STATUS_LABELS[nextStatus]}` });
      fetchDeals();
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    } finally {
      setAdvancing(null);
    }
  }

  async function handleReject(dealId: string) {
    await supabase.from('deals').update({ status: 'rejected' }).eq('id', dealId);
    fetchDeals();
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deals</h1>
          <p className="text-sm text-muted-foreground">{deals.length} deals</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product</th>
                {isAdmin && <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Agent</th>}
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comm.</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: isAdmin ? 6 : 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : deals.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-12 text-center text-muted-foreground">No deals found</td>
                </tr>
              ) : (
                deals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{deal.products?.title ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{deal.products?.marketplace_country}</p>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground text-xs">{deal.profiles?.name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{deal.profiles?.email}</p>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <p className="text-foreground">{deal.customer_name ?? '—'}</p>
                      {deal.customer_telegram && <p className="text-xs text-muted-foreground">{deal.customer_telegram}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-success">
                      {deal.commission_eur ? `€${deal.commission_eur.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={STATUS_BADGE[deal.status] ?? 'badge-pending'}>
                        {STATUS_LABELS[deal.status] ?? deal.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs" onClick={() => setReviewDeal(deal)}>
                          <Eye className="w-3 h-3" /> View
                        </Button>
                        {isAdmin && ADMIN_NEXT_STATUS[deal.status] && (
                          <Button
                            size="sm"
                            className="h-7 px-2 gap-1 text-xs"
                            disabled={advancing === deal.id}
                            onClick={() => handleAdvanceStatus(deal)}
                          >
                            {advancing === deal.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            {STATUS_LABELS[ADMIN_NEXT_STATUS[deal.status]!]}
                          </Button>
                        )}
                        {isAdmin && !['rejected', 'completed'].includes(deal.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 gap-1 text-xs border-destructive text-destructive hover:bg-destructive/10"
                            onClick={() => handleReject(deal.id)}
                          >
                            <XCircle className="w-3 h-3" /> Reject
                          </Button>
                        )}
                        {/* Agent: upload review */}
                        {!isAdmin && deal.status === 'approved' && !deal.review_link && (
                          <ReviewUploadButton deal={deal} onSuccess={fetchDeals} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deal detail dialog */}
      {reviewDeal && (
        <Dialog open onOpenChange={() => setReviewDeal(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Deal Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Product:</span><br /><span className="font-medium">{reviewDeal.products?.title}</span></div>
                <div><span className="text-muted-foreground">Status:</span><br /><span className={STATUS_BADGE[reviewDeal.status]}>{STATUS_LABELS[reviewDeal.status]}</span></div>
                <div><span className="text-muted-foreground">Customer:</span><br /><span className="font-medium">{reviewDeal.customer_name}</span></div>
                <div><span className="text-muted-foreground">Commission:</span><br /><span className="font-medium text-success">€{reviewDeal.commission_eur?.toFixed(2)}</span></div>
                <div><span className="text-muted-foreground">Amazon Profile:</span><br />{reviewDeal.amazon_profile_url ? <a href={reviewDeal.amazon_profile_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs break-all">{reviewDeal.amazon_profile_url}</a> : '—'}</div>
                <div><span className="text-muted-foreground">Review Link:</span><br />{reviewDeal.review_link ? <a href={reviewDeal.review_link} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs break-all">{reviewDeal.review_link}</a> : '—'}</div>
              </div>
              {reviewDeal.admin_note && (
                <div className="bg-muted/60 rounded p-3">
                  <p className="text-xs text-muted-foreground mb-1">Admin note:</p>
                  <p>{reviewDeal.admin_note}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ReviewUploadButton({ deal, onSuccess }: { deal: Deal; onSuccess: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reviewLink, setReviewLink] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast({ title: 'Please attach a screenshot', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user!.id}/${deal.id}-review.${ext}`;
      const { error: upErr } = await supabase.storage.from('screenshots').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { error } = await supabase.from('deals').update({ status: 'review_uploaded', review_link: reviewLink, review_screenshot_path: path }).eq('id', deal.id);
      if (error) throw error;
      toast({ title: 'Review uploaded!' });
      setOpen(false);
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs" onClick={() => setOpen(true)}>
        <Upload className="w-3 h-3" /> Upload Review
      </Button>
      {open && (
        <Dialog open onOpenChange={() => setOpen(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Upload Review</DialogTitle></DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Review Link *</Label>
                <Input value={reviewLink} onChange={(e) => setReviewLink(e.target.value)} placeholder="https://amazon.com/review/..." required />
              </div>
              <div className="space-y-1.5">
                <Label>Review Screenshot *</Label>
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{file ? file.name : 'Click to upload'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Uploading…</> : 'Submit Review'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
