import { useEffect, useState, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, ExternalLink, BookmarkPlus, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

interface Product {
  id: string;
  title: string;
  asin: string | null;
  amazon_url: string | null;
  marketplace_country: string | null;
  price_eur: number | null;
  total_qty: number;
  daily_limit: number | null;
  commission_eur: number;
  main_image_url: string | null;
  is_active: boolean;
  owner_id: string;
  start_date: string | null;
  end_date: string | null;
}

export default function ProductsPage() {
  const { isAdmin, isSeller, user } = useAuth();
  const { activeCountry } = useOutletContext<{ activeCountry: string | null }>();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [reserving, setReserving] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (activeCountry) q = q.eq('marketplace_country', activeCountry as 'ES' | 'DE' | 'FR' | 'IT' | 'UK');
    if (search) q = q.ilike('title', `%${search}%`);

    const { data, count, error } = await q;
    if (!error) {
      setProducts((data ?? []) as Product[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [activeCountry, search, page]);

  useEffect(() => {
    setPage(0);
  }, [activeCountry, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  async function handleReserve(productId: string) {
    setReserving(productId);
    try {
      const { data, error } = await supabase.rpc('create_hold', {
        p_product_id: productId,
        p_agent_id: user!.id,
      });
      if (error) throw error;
      toast({ title: 'Hold created!', description: 'You have 30 minutes to complete the order.' });
    } catch (err: any) {
      toast({ title: 'Cannot reserve', description: err.message, variant: 'destructive' });
    } finally {
      setReserving(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const getStatus = (p: Product) => {
    const now = new Date();
    if (!p.is_active) return { label: 'Inactive', cls: 'badge-expired' };
    if (p.end_date && new Date(p.end_date) < now) return { label: 'Ended', cls: 'badge-expired' };
    if (p.start_date && new Date(p.start_date) > now) return { label: 'Upcoming', cls: 'badge-pending' };
    return { label: 'Available', cls: 'badge-active' };
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground text-sm">{total} products found</p>
        </div>
        {(isAdmin || isSeller) && (
          <Link to="/products/new">
            <Button className="gap-2"><Plus className="w-4 h-4" /> New Product</Button>
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ASIN</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Country</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Price</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qty / Day</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comm.</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No products found</td>
                </tr>
              ) : (
                products.map((p) => {
                  const status = getStatus(p);
                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.main_image_url ? (
                            <img src={p.main_image_url} alt="" className="w-10 h-10 object-contain rounded border border-border bg-white" />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded border border-border flex items-center justify-center text-muted-foreground text-xs">IMG</div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate max-w-[200px]">{p.title}</p>
                            {p.amazon_url && (
                              <a href={p.amazon_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                                Amazon <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.asin ?? '—'}</td>
                      <td className="px-4 py-3">
                        {p.marketplace_country ? (
                          <span className="text-xs font-semibold bg-accent text-accent-foreground px-2 py-0.5 rounded">{p.marketplace_country}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {p.price_eur ? `€${p.price_eur.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {p.total_qty}{p.daily_limit ? ` / ${p.daily_limit}` : ''}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-success">
                        €{p.commission_eur.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={status.cls}>{status.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(isAdmin || p.owner_id === user?.id) && (
                            <Link to={`/products/${p.id}/edit`}>
                              <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs">
                                <Pencil className="w-3 h-3" /> Edit
                              </Button>
                            </Link>
                          )}
                          {status.label === 'Available' && !isAdmin && !isSeller && (
                            <Button
                              size="sm"
                              className="h-7 px-3 gap-1 text-xs"
                              disabled={reserving === p.id}
                              onClick={() => handleReserve(p.id)}
                            >
                              {reserving === p.id ? (
                                <span className="w-3 h-3 border border-primary-foreground border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <BookmarkPlus className="w-3 h-3" />
                              )}
                              Reserve
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
