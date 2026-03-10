import { Coins, Briefcase, Heart, User } from 'lucide-react';

export type Pillar = 'personal' | 'professional' | 'vitality' | 'capital';
export type Priority = 'high' | 'medium' | 'low';

export const PRIORITY_ORDER: Priority[] = ['high', 'medium', 'low'];

export const PILLAR_CONFIG: {
  id: Pillar;
  label: string;
  icon: typeof Coins;
  description?: string;
}[] = [
  { id: 'capital', label: 'Capital', icon: Coins, description: 'Wealth Expansion' },
  { id: 'professional', label: 'Professional', icon: Briefcase, description: 'Empire Ops' },
  { id: 'vitality', label: 'Vitality', icon: Heart, description: 'Biological Power' },
  { id: 'personal', label: 'Personal', icon: User, description: 'Legacy Integrity' },
];
