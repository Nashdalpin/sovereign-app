"use client"

import React from "react";
import Link from "next/link";
import { DailyPlaybook } from "@/components/DailyPlaybook";

export default function DailyPlaybookPage() {
  return (
    <div className="page-content animate-in fade-in duration-500">
      <DailyPlaybook />
      <footer className="pb-10 pt-8 text-center">
        <Link href="/today" className="text-[8px] font-black uppercase tracking-[0.6em] text-muted-foreground hover:text-primary transition-colors">
          Execute from Presence
        </Link>
      </footer>
    </div>
  );
}

