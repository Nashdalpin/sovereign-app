
"use client"

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Crown, Compass, ShieldCheck, Sun, Moon, ChartNoAxesCombined, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { FocoProvider } from "@/lib/store";
import { SovereignVoice } from "@/components/SovereignVoice";
import { createClient } from '@/lib/supabase/client';

const NavItems = [
  { icon: Crown, label: 'Empire', href: '/' },
  { icon: Compass, label: 'Presence', href: '/today' },
  { icon: ShieldCheck, label: 'Altar', href: '/sanctuary' },
  { icon: ChartNoAxesCombined, label: 'Progress', href: '/progress' },
];

const API_OFFLINE_TOAST_COOLDOWN_MS = 30_000;

export function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);
  const lastApiOfflineToastAt = useRef<number>(0);

  useEffect(() => {
    const onApiOffline = () => {
      if (Date.now() - lastApiOfflineToastAt.current < API_OFFLINE_TOAST_COOLDOWN_MS) return;
      lastApiOfflineToastAt.current = Date.now();
      toast({
        title: 'Sem ligação ao servidor',
        description: 'Verifica a rede ou se o servidor está a correr. Os dados locais serão usados quando possível.',
        variant: 'destructive',
      });
    };
    window.addEventListener('sovereign:api-offline', onApiOffline);
    return () => window.removeEventListener('sovereign:api-offline', onApiOffline);
  }, [toast]);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('sovereign_theme');
    if (saved) {
      setTheme(saved as 'light' | 'dark');
      document.documentElement.classList.toggle('dark', saved === 'dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const isAuthPage = pathname === '/login' || pathname === '/signup';
  if (isAuthPage) {
    return <>{children}</>;
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('sovereign_theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background text-foreground font-body flex items-center justify-center">
        <p className="text-[9px] font-black uppercase tracking-[1em] opacity-30 animate-pulse">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body selection:bg-primary/30">
      <header className="min-h-16 h-16 flex items-center justify-between px-6 fixed top-0 w-full z-40 bg-background/30 backdrop-blur-xl border-b border-white/5 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-4">
          <span className="text-[8px] font-black uppercase tracking-[0.8em] opacity-30 gold-glow">Sovereign</span>
          <SovereignVoice />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleTheme} aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'} className="opacity-30 hover:opacity-100 transition-all p-2">
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
          <button onClick={() => window.close()} aria-label="Fechar app" className="opacity-30 hover:opacity-100 transition-all p-2" title="Fechar app">
            <X size={14} />
          </button>
          <button onClick={handleLogout} aria-label="Sign out" className="opacity-30 hover:opacity-100 transition-all p-2" title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </header>
      <main className="relative z-10 pt-20 pb-[calc(8rem+env(safe-area-inset-bottom,0px))]">{children}</main>
      
      <nav className="fixed left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-[340px] bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        <div className="luxury-blur rounded-full luxury-shadow flex justify-around items-center h-16 px-2 border border-white/10 backdrop-blur-3xl bg-black/50">
          {NavItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname === item.href || (item.href === '/sanctuary' && pathname.startsWith('/sanctuary'));
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                aria-label={`Go to ${item.label}`}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-12 rounded-full transition-all duration-500",
                  isActive ? "text-primary scale-110 gold-glow" : "text-foreground/30 hover:text-foreground/50"
                )}
              >
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className={cn(
                  "text-[6px] font-black uppercase tracking-[0.2em] mt-1 transition-all duration-500 whitespace-nowrap",
                  isActive ? "opacity-100" : "opacity-0 scale-75"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
      <Toaster />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FocoProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </FocoProvider>
  );
}
