"use client";

import type { LucideIcon } from "lucide-react";
import {
  Moon,
  Dumbbell,
  Apple,
  Heart,
  Droplets,
  BookOpen,
  Coffee,
  Sun,
  Sparkles,
  Target,
} from "lucide-react";

export const RITUAL_ICON_MAP: Record<string, LucideIcon> = {
  moon: Moon,
  dumbbell: Dumbbell,
  apple: Apple,
  heart: Heart,
  droplets: Droplets,
  bookOpen: BookOpen,
  coffee: Coffee,
  sun: Sun,
  sparkles: Sparkles,
  target: Target,
};

export const RITUAL_ICON_KEYS = Object.keys(RITUAL_ICON_MAP) as string[];
