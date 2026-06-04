import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { CreditCard, Receipt, Settings, Shield, LayoutDashboard } from 'lucide-react';

const navItems = [
  { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/bills', label: 'Bills', icon: Receipt },
  { href: '/kyc', label: 'Verification', icon: Shield },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card p-4">
        <Link href="/subscriptions" className="flex items-center gap-2 px-2 py-4">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">
            Middle<span className="text-primary">Man</span>
          </span>
        </Link>
        <nav className="mt-6 flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t">
          <UserButton afterSignOutUrl="/" />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between border-b px-4 py-3">
          <span className="text-lg font-bold">
            Middle<span className="text-primary">Man</span>
          </span>
          <UserButton afterSignOutUrl="/" />
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
