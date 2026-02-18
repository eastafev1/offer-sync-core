import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Upload } from 'lucide-react';

interface SellOrderDialogProps {
  hold: { id: string; products: { title: string } | null };
  onClose: () => void;
  onSuccess: () => void;
}

export function SellOrderDialog({ hold, onClose, onSuccess }: SellOrderDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    amazon_profile_url: '',
    customer_paypal: '',
    customer_name: '',
    customer_telegram: '',
  });

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!screenshotFile) {
      toast({ title: 'Please upload an order screenshot', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      // Upload screenshot
      const ext = screenshotFile.name.split('.').pop();
      const path = `${user!.id}/${hold.id}-order.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('screenshots')
        .upload(path, screenshotFile, { upsert: true });
      if (uploadErr) throw uploadErr;

      // Convert hold to deal
      const { error } = await supabase.rpc('convert_hold_to_deal', {
        p_hold_id: hold.id,
        p_agent_id: user!.id,
        p_amazon_profile_url: form.amazon_profile_url,
        p_customer_paypal: form.customer_paypal,
        p_customer_name: form.customer_name,
        p_customer_telegram: form.customer_telegram,
        p_order_screenshot_path: path,
      });
      if (error) throw error;

      toast({ title: 'Order submitted!', description: 'Your deal is now under review.' });
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Submit failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Order — {hold.products?.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Amazon Profile URL *</Label>
            <Input value={form.amazon_profile_url} onChange={f('amazon_profile_url')} placeholder="https://www.amazon.es/gp/profile/..." required />
          </div>
          <div className="space-y-1.5">
            <Label>Customer Name *</Label>
            <Input value={form.customer_name} onChange={f('customer_name')} placeholder="Full name" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Customer PayPal</Label>
              <Input value={form.customer_paypal} onChange={f('customer_paypal')} placeholder="paypal@..." />
            </div>
            <div className="space-y-1.5">
              <Label>Customer Telegram</Label>
              <Input value={form.customer_telegram} onChange={f('customer_telegram')} placeholder="@handle" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Order Screenshot *</Label>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {screenshotFile ? screenshotFile.name : 'Click to upload screenshot'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setScreenshotFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting…</> : 'Submit Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
