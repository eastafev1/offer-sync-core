import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  FileText, Clock, CheckCircle2, DollarSign,
  Package, BookmarkCheck, TrendingUp, ShieldAlert, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KpiTile {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}

function KpiCard({ tile }: { tile: KpiTile }) {
  return (
    <div className={`kpi-tile ${tile.color}`}>
      <div className="flex items-center justify-between">
        <tile.icon className="w-7 h-7 opacity-90" />
        <span className="text-3xl font-bold">{tile.value}</span>
      </div>
      <p className="text-sm opacity-80 font-medium">{tile.label}</p>
    </div>
  );
}

// ---- CSV export types & helper ----
interface CommissionRow {
  id: string;
  deal_id: string;
  agent_id: string;
  agent_name: string;
  agent_email: string;
  product_title: string;
  amount_eur: number;
  created_at: string;
}

function exportCommissionsCSV(rows: CommissionRow[]) {
  const header = ['Agent Name', 'Agent Email', 'Product', 'Commission (€)', 'Deal ID', 'Date'];
  const lines = rows.map((r) => [
    `"${r.agent_name.replace(/"/g, '""')}"`,
    `"${r.agent_email.replace(/"/g, '""')}"`,
    `"${r.product_title.replace(/"/g, '""')}"`,
    r.amount_eur.toFixed(2),
    r.deal_id,
    new Date(r.created_at).toLocaleDateString('en-GB'),
  ].join(','));
  const csv = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `commissions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const { isAdmin, isSeller, isAgent, user } = useAuth();
  const { activeCountry } = useOutletContext<{ activeCountry: string | null }>();
  const { toast } = useToast();

  // Admin stats
  const [adminStats, setAdminStats] = useState({
    total: 0, awaiting: 0, completed: 0, commission: 0,
  });
  const [salesChart, setSalesChart] = useState<{ date: string; deals: number }[]>([]);
  const [salesByCountry, setSalesByCountry] = useState<{ country: string; deals: number; commission: number }[]>([]);
  const [exportLoading, setExportLoading] = useState(false);

  // Agent stats
  const [agentStats, setAgentStats] = useState({ activeHolds: 0, submitted: 0, completed: 0, commission: 0 });

  // Seller stats
  const [sellerStats, setSellerStats] = useState({ products: 0, sales: 0, blocked: 0 });

  useEffect(() => {
    if (isAdmin) loadAdminStats();
    if (isAgent && !isAdmin) loadAgentStats();
    if (isSeller && !isAdmin) loadSellerStats();
  }, [isAdmin, isSeller, isAgent, activeCountry]);

  async function loadAdminStats() {
    const [total, awaiting, completed, credits, metrics, byCountry] = await Promise.all([
      supabase.from('deals').select('id', { count: 'exact', head: true }),
      supabase.from('deals').select('id', { count: 'exact', head: true }).in('status', ['sold_submitted', 'review_uploaded']),
      supabase.from('deals').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('commission_credits').select('amount_eur'),
      supabase.from('admin_sales_metrics').select('sale_date,deal_count').order('sale_date', { ascending: false }).limit(14),
      supabase.from('admin_sales_metrics').select('country,deal_count,total_commission_eur'),
    ]);

    const totalComm = (credits.data ?? []).reduce((s, r) => s + Number(r.amount_eur), 0);
    setAdminStats({
      total: total.count ?? 0,
      awaiting: awaiting.count ?? 0,
      completed: completed.count ?? 0,
      commission: totalComm,
    });

    setSalesChart(
      (metrics.data ?? [])
        .reverse()
        .map((r) => ({ date: r.sale_date as string, deals: Number(r.deal_count) }))
    );

    const grouped: Record<string, { deals: number; commission: number }> = {};
    for (const r of byCountry.data ?? []) {
      const c = (r.country as string) ?? 'Unknown';
      if (!grouped[c]) grouped[c] = { deals: 0, commission: 0 };
      grouped[c].deals += Number(r.deal_count);
      grouped[c].commission += Number(r.total_commission_eur ?? 0);
    }
    setSalesByCountry(Object.entries(grouped).map(([country, v]) => ({ country, ...v })));
  }

  async function loadAgentStats() {
    const [holds, submitted, completed, credits] = await Promise.all([
      supabase.from('holds').select('id', { count: 'exact', head: true }).eq('agent_id', user!.id).eq('status', 'active'),
      supabase.from('deals').select('id', { count: 'exact', head: true }).eq('agent_id', user!.id).in('status', ['sold_submitted', 'review_uploaded']),
      supabase.from('deals').select('id', { count: 'exact', head: true }).eq('agent_id', user!.id).eq('status', 'completed'),
      supabase.from('commission_credits').select('amount_eur').eq('agent_id', user!.id),
    ]);
    const totalComm = (credits.data ?? []).reduce((s, r) => s + Number(r.amount_eur), 0);
    setAgentStats({ activeHolds: holds.count ?? 0, submitted: submitted.count ?? 0, completed: completed.count ?? 0, commission: totalComm });
  }

  async function loadSellerStats() {
    const [prods] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('owner_id', user!.id),
    ]);
    setSellerStats({ products: prods.count ?? 0, sales: 0, blocked: 0 });
  }

  async function handleExportCommissions() {
    setExportLoading(true);
    try {
      const { data: credits, error } = await supabase
        .from('commission_credits')
        .select('id, deal_id, agent_id, amount_eur, created_at, products(title)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch agent profiles for names/emails
      const agentIds = [...new Set((credits ?? []).map((c) => c.agent_id))];
      const { data: profilesData } = agentIds.length > 0
        ? await supabase.from('profiles').select('id, name, email').in('id', agentIds)
        : { data: [] };

      const profileMap = Object.fromEntries((profilesData ?? []).map((p) => [p.id, p]));

      const rows: CommissionRow[] = (credits ?? []).map((c) => {
        const prof = profileMap[c.agent_id] ?? { name: 'Unknown', email: '' };
        const product = c.products as { title: string } | null;
        return {
          id: c.id,
          deal_id: c.deal_id,
          agent_id: c.agent_id,
          agent_name: prof.name,
          agent_email: prof.email ?? '',
          product_title: product?.title ?? '—',
          amount_eur: Number(c.amount_eur),
          created_at: c.created_at,
        };
      });

      if (rows.length === 0) {
        toast({ title: 'No commissions to export yet.' });
        return;
      }

      exportCommissionsCSV(rows);
      toast({ title: `Exported ${rows.length} commission records.` });
    } catch (err: any) {
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
    } finally {
      setExportLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {activeCountry ? `Viewing: ${activeCountry}` : 'All countries'}
        </p>
      </div>

      {/* ADMIN */}
      {isAdmin && (
        <>
          {/* KPI tiles row + Export button */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard tile={{ label: 'Total Deals', value: adminStats.total, icon: FileText, color: 'bg-tile-blue' }} />
              <KpiCard tile={{ label: 'Awaiting Review', value: adminStats.awaiting, icon: ShieldAlert, color: 'bg-tile-orange' }} />
              <KpiCard tile={{ label: 'Completed', value: adminStats.completed, icon: CheckCircle2, color: 'bg-tile-green' }} />
              <KpiCard tile={{ label: 'Commission Paid (€)', value: `€${adminStats.commission.toFixed(2)}`, icon: DollarSign, color: 'bg-tile-purple' }} />
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={exportLoading}
                onClick={handleExportCommissions}
              >
                {exportLoading ? (
                  <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export Commissions CSV
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales chart */}
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Sales — Last 14 Days</h2>
              {salesChart.length === 0 ? (
                <p className="text-muted-foreground text-sm">No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={salesChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
                    />
                    <Bar dataKey="deals" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Sales by country */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Sales by Country</h2>
              {salesByCountry.length === 0 ? (
                <p className="text-muted-foreground text-sm">No data yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground text-xs">
                      <th className="text-left pb-2">Country</th>
                      <th className="text-right pb-2">Deals</th>
                      <th className="text-right pb-2">Comm (€)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {salesByCountry.map((r) => (
                      <tr key={r.country}>
                        <td className="py-1.5 font-medium">{r.country}</td>
                        <td className="py-1.5 text-right">{r.deals}</td>
                        <td className="py-1.5 text-right">€{r.commission.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* AGENT (not admin) */}
      {isAgent && !isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard tile={{ label: 'Active Holds', value: agentStats.activeHolds, icon: BookmarkCheck, color: 'bg-tile-blue' }} />
          <KpiCard tile={{ label: 'Deals Pending', value: agentStats.submitted, icon: Clock, color: 'bg-tile-orange' }} />
          <KpiCard tile={{ label: 'Completed Deals', value: agentStats.completed, icon: CheckCircle2, color: 'bg-tile-green' }} />
          <KpiCard tile={{ label: 'Commission Earned (€)', value: `€${agentStats.commission.toFixed(2)}`, icon: TrendingUp, color: 'bg-tile-purple' }} />
        </div>
      )}

      {/* SELLER (not admin) */}
      {isSeller && !isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard tile={{ label: 'My Products', value: sellerStats.products, icon: Package, color: 'bg-tile-blue' }} />
          <KpiCard tile={{ label: 'Sales on My Products', value: sellerStats.sales, icon: FileText, color: 'bg-tile-green' }} />
          <KpiCard tile={{ label: 'Blocked Agents', value: sellerStats.blocked, icon: ShieldAlert, color: 'bg-tile-orange' }} />
        </div>
      )}
    </div>
  );
}
