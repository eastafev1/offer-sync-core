import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Link2, Loader2, AlertCircle } from 'lucide-react';

const COUNTRIES = ['ES', 'DE', 'FR', 'IT', 'UK'] as const;

interface ProductForm {
  title: string;
  asin: string;
  amazon_url: string;
  marketplace_country: string;
  price_eur: string;
  total_qty: string;
  daily_limit: string;
  start_date: string;
  end_date: string;
  commission_eur: string;
  main_image_url: string;
}

const DEFAULT_FORM: ProductForm = {
  title: '', asin: '', amazon_url: '', marketplace_country: '',
  price_eur: '', total_qty: '1', daily_limit: '',
  start_date: '', end_date: '', commission_eur: '', main_image_url: '',
};

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isEdit = !!id;

  const [form, setForm] = useState<ProductForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  useEffect(() => {
    if (isEdit) loadProduct();
  }, [id]);

  async function loadProduct() {
    const { data } = await supabase.from('products').select('*').eq('id', id).single();
    if (data) {
      setForm({
        title: data.title ?? '',
        asin: data.asin ?? '',
        amazon_url: data.amazon_url ?? '',
        marketplace_country: data.marketplace_country ?? '',
        price_eur: data.price_eur?.toString() ?? '',
        total_qty: data.total_qty?.toString() ?? '1',
        daily_limit: data.daily_limit?.toString() ?? '',
        start_date: data.start_date ?? '',
        end_date: data.end_date ?? '',
        commission_eur: data.commission_eur?.toString() ?? '',
        main_image_url: data.main_image_url ?? '',
      });
    }
  }

  async function handleAmazonPreview() {
    if (!form.amazon_url) return;
    setPreviewLoading(true);
    setPreviewError('');
    try {
      const { data, error } = await supabase.functions.invoke('amazon-preview', {
        body: { url: form.amazon_url },
      });
      if (error) throw error;
      if (data?.title) {
        setForm((f) => ({
          ...f,
          title: data.title || f.title,
          asin: data.asin || f.asin,
          marketplace_country: data.country || f.marketplace_country,
          price_eur: data.price?.toString() || f.price_eur,
          main_image_url: data.image || f.main_image_url,
        }));
        toast({ title: 'Product data fetched!', description: 'Review and adjust the fields as needed.' });
      } else {
        setPreviewError('Could not extract product data. Please fill manually.');
      }
    } catch {
      setPreviewError('Amazon preview failed. Please fill the fields manually.');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleTelegramPublish() {
    if (!id) return;
    try {
      const { error } = await supabase.functions.invoke('telegram-publish', {
        body: { product_id: id },
      });
      if (error) throw error;
      toast({ title: 'Published to Telegram!' });
    } catch (err: any) {
      toast({ title: 'Telegram publish failed', description: err.message, variant: 'destructive' });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        asin: form.asin || null,
        amazon_url: form.amazon_url || null,
        marketplace_country: (form.marketplace_country as typeof COUNTRIES[number]) || null,
        price_eur: form.price_eur ? parseFloat(form.price_eur) : null,
        total_qty: parseInt(form.total_qty) || 1,
        daily_limit: form.daily_limit ? parseInt(form.daily_limit) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        commission_eur: parseFloat(form.commission_eur) || 0,
        main_image_url: form.main_image_url || null,
        owner_id: user!.id,
      };

      if (isEdit) {
        const { error } = await supabase.from('products').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
      }

      toast({ title: isEdit ? 'Product updated!' : 'Product created!' });
      navigate('/products');
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const f = (field: keyof ProductForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/products')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h1 className="text-xl font-bold text-foreground">{isEdit ? 'Edit Product' : 'New Product'}</h1>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        {/* Amazon URL + Preview */}
        <div className="space-y-2">
          <Label>Amazon URL</Label>
          <div className="flex gap-2">
            <Input
              value={form.amazon_url}
              onChange={f('amazon_url')}
              placeholder="https://www.amazon.es/dp/..."
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={handleAmazonPreview} disabled={previewLoading || !form.amazon_url} className="gap-2 flex-shrink-0">
              {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Preview
            </Button>
          </div>
          {previewError && (
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> {previewError}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={form.title} onChange={f('title')} required placeholder="Product title" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="asin">ASIN</Label>
              <Input id="asin" value={form.asin} onChange={f('asin')} placeholder="B08XYZ..." />
            </div>
            <div className="space-y-1.5">
              <Label>Marketplace Country</Label>
              <Select
                value={form.marketplace_country}
                onValueChange={(v) => setForm((f) => ({ ...f, marketplace_country: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="price">Price (€)</Label>
              <Input id="price" type="number" step="0.01" value={form.price_eur} onChange={f('price_eur')} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qty">Total Qty *</Label>
              <Input id="qty" type="number" min="1" value={form.total_qty} onChange={f('total_qty')} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="daily">Daily Limit</Label>
              <Input id="daily" type="number" min="1" value={form.daily_limit} onChange={f('daily_limit')} placeholder="Unlimited" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="comm">Commission (€) *</Label>
              <Input id="comm" type="number" step="0.01" min="0" value={form.commission_eur} onChange={f('commission_eur')} required placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start">Start Date</Label>
              <Input id="start" type="date" value={form.start_date} onChange={f('start_date')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end">End Date</Label>
              <Input id="end" type="date" value={form.end_date} onChange={f('end_date')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="img">Image URL</Label>
            <Input id="img" value={form.main_image_url} onChange={f('main_image_url')} placeholder="https://..." />
            {form.main_image_url && (
              <img src={form.main_image_url} alt="" className="w-24 h-24 object-contain border border-border rounded bg-white mt-1" />
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving…</> : isEdit ? 'Update Product' : 'Create Product'}
            </Button>
            {isEdit && (
              <Button type="button" variant="outline" onClick={handleTelegramPublish}>
                📢 Publish to Telegram
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
