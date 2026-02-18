import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Package, BookmarkCheck, FileText, Users, Settings,
  ChevronDown, ChevronRight, Globe, Menu, X, Store
} from 'lucide-react';

const COUNTRIES = ['ES', 'DE', 'FR', 'IT', 'UK'];

const COUNTRY_FLAGS: Record<string, string> = {
  ES: '🇪🇸', DE: '🇩🇪', FR: '🇫🇷', IT: '🇮🇹', UK: '🇬🇧',
};

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: ('admin' | 'seller' | 'agent')[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Holds / Bookings', href: '/holds', icon: BookmarkCheck, roles: ['admin', 'agent'] },
  { label: 'Deals', href: '/deals', icon: FileText },
  { label: 'My Products', href: '/seller', icon: Store, roles: ['seller', 'admin'] },
  { label: 'Users', href: '/admin/users', icon: Users, roles: ['admin'] },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeCountry: string | null;
  onCountryChange: (c: string | null) => void;
}

export function AppSidebar({ collapsed, onToggle, activeCountry, onCountryChange }: SidebarProps) {
  const { isAdmin, isSeller, isAgent, countries } = useAuth();
  const location = useLocation();
  const [countryOpen, setCountryOpen] = useState(true);

  const userRoles = [
    ...(isAdmin ? ['admin' as const] : []),
    ...(isSeller ? ['seller' as const] : []),
    ...(isAgent ? ['agent' as const] : []),
  ];

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.some((r) => userRoles.includes(r));
  });

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

  // Available countries for filter: admins see all, others see assigned
  const availableCountries = isAdmin ? COUNTRIES : countries;

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-200 flex-shrink-0',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* Logo area */}
      <div className="flex items-center h-14 px-3 border-b border-sidebar-border gap-2">
        <button
          onClick={onToggle}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
        {!collapsed && (
          <span className="text-sidebar-foreground font-bold text-sm tracking-wide">CRM Portal</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <ul className="space-y-0.5 px-2">
          {visibleItems.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors group',
                    active
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Country filter */}
        {!collapsed && availableCountries.length > 0 && (
          <div className="mt-4 px-2">
            <button
              onClick={() => setCountryOpen((o) => !o)}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider hover:text-sidebar-foreground transition-colors"
            >
              <Globe className="w-3 h-3" />
              Countries
              {countryOpen ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
            </button>
            {countryOpen && (
              <ul className="mt-1 space-y-0.5">
                <li>
                  <button
                    onClick={() => onCountryChange(null)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                      activeCountry === null
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    )}
                  >
                    <span>🌍</span>
                    <span>All Countries</span>
                  </button>
                </li>
                {availableCountries.map((c) => (
                  <li key={c}>
                    <button
                      onClick={() => onCountryChange(c)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                        activeCountry === c
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent'
                      )}
                    >
                      <span>{COUNTRY_FLAGS[c]}</span>
                      <span>{c}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Collapsed country dots */}
        {collapsed && availableCountries.length > 0 && (
          <div className="mt-3 flex flex-col items-center gap-1 px-1">
            {availableCountries.map((c) => (
              <button
                key={c}
                onClick={() => onCountryChange(activeCountry === c ? null : c)}
                title={c}
                className={cn(
                  'w-8 h-8 flex items-center justify-center rounded-md text-xs transition-colors',
                  activeCountry === c
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                {COUNTRY_FLAGS[c]}
              </button>
            ))}
          </div>
        )}
      </nav>
    </aside>
  );
}
