import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import {
  AlertTriangle,
  Shield,
  DollarSign,
  ShieldAlert,
  HelpCircle,
  ClipboardList,
  LayoutDashboard,
} from 'lucide-react';

const navItems = [
  { href: '/delinquencies', label: 'Delinquencies', icon: AlertTriangle },
  { href: '/kyc-queue', label: 'KYC Queue', icon: Shield },
  { href: '/float-caps', label: 'Float Caps', icon: DollarSign },
  { href: '/fraud', label: 'Fraud', icon: ShieldAlert },
  { href: '/unknown-merchants', label: 'Unknown Merchants', icon: HelpCircle },
  { href: '/audit', label: 'Audit Log', icon: ClipboardList },
];

export default function AdminDashLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-card p-4 flex flex-col">
        <Link href="/delinquencies" className="flex items-center gap-2 px-2 py-4">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">
            MM <span className="text-muted-foreground text-sm font-normal">Admin</span>
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
      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </div>
  );
}
