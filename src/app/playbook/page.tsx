"use client"

import React from "react";
import { DailyPlaybook } from "@/components/DailyPlaybook";

export default function DailyPlaybookPage() {
  return (
    <div className="max-w-screen-sm mx-auto px-8 animate-in fade-in duration-1000">
      <DailyPlaybook />
      <footer className="pb-10 pt-8 text-center">
        <p className="text-[8px] font-black uppercase tracking-[0.6em] opacity-20">
          Execute from Presence · /today
        </p>
      </footer>
    </div>
  );
}

