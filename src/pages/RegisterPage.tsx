import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const COUNTRIES = ['ES', 'DE', 'FR', 'IT', 'UK'] as const;
const ROLES = [
  { value: 'agent', label: 'Agent', desc: 'Reserve and sell products, earn commissions' },
  { value: 'seller', label: 'Seller', desc: 'Create and manage products, view your sales' },
] as const;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'agent' | 'seller'>('agent');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    telegram_username: '', paypal: '', payment_details: '',
    about: '', recommendations: '',
  });

  const toggleCountry = (c: string) =>
    setSelectedCountries((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (form.password.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    if (selectedCountries.length === 0) {
      toast({ title: 'Please select at least one country', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            name: form.name,
            role: selectedRole,
            telegram_username: form.telegram_username || '',
            paypal: form.paypal || '',
            payment_details: form.payment_details || '',
            about: form.about || '',
            recommendations: form.recommendations || '',
            countries: selectedCountries,
          },
        },
      });
      if (error) throw error;

      toast({ title: 'Registration submitted!', description: 'An admin will review your account shortly.' });
      navigate('/pending');
    } catch (err: any) {
      toast({ title: 'Registration failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(222,35%,14%)] to-[hsl(222,35%,8%)] py-10 px-4">
      <div className="w-full max-w-2xl bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
        <div className="bg-primary px-8 py-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-foreground/10 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">Create Account</h1>
            <p className="text-sm text-primary-foreground/70">CRM Portal — Registration</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Role selection */}
          <div className="space-y-2">
            <Label>I want to register as</Label>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setSelectedRole(r.value)}
                  className={cn(
                    'p-4 rounded-lg border-2 text-left transition-all',
                    selectedRole === r.value
                      ? 'border-primary bg-accent'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <p className="font-semibold text-sm text-foreground">{r.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" value={form.name} onChange={f('name')} placeholder="John Doe" required />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={form.email} onChange={f('email')} placeholder="you@example.com" required />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="password">Password *</Label>
              <Input id="password" type="password" value={form.password} onChange={f('password')} placeholder="Min 8 characters" required />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="confirm">Confirm Password *</Label>
              <Input id="confirm" type="password" value={form.confirmPassword} onChange={f('confirmPassword')} placeholder="Repeat password" required />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="telegram">Telegram Username</Label>
              <Input id="telegram" value={form.telegram_username} onChange={f('telegram_username')} placeholder="@username" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paypal">PayPal Email</Label>
              <Input id="paypal" value={form.paypal} onChange={f('paypal')} placeholder="paypal@example.com" />
            </div>
          </div>

          {/* Desired countries */}
          <div className="space-y-2">
            <Label>Desired Working Countries *</Label>
            <div className="flex gap-2 flex-wrap">
              {COUNTRIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCountry(c)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-medium border-2 transition-all',
                    selectedCountries.includes(c)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-foreground hover:border-primary'
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Optional fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="payment_details">Payment Details</Label>
              <Textarea id="payment_details" value={form.payment_details} onChange={f('payment_details')} placeholder="Bank details, preferred payment method…" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="about">About Yourself</Label>
              <Textarea id="about" value={form.about} onChange={f('about')} placeholder="Brief introduction…" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recommendations">Recommendations</Label>
              <Textarea id="recommendations" value={form.recommendations} onChange={f('recommendations')} placeholder="Who referred you? Any relevant experience…" rows={2} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Submitting…
              </span>
            ) : (
              <span className="flex items-center gap-2">Submit Application <ChevronRight className="w-4 h-4" /></span>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
