import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeCountry, setActiveCountry] = useState<string | null>(null);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        activeCountry={activeCountry}
        onCountryChange={setActiveCountry}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppHeader activeCountry={activeCountry} />
        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ activeCountry }} />
        </main>
      </div>
    </div>
  );
}
