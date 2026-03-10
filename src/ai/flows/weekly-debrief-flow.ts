'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const WeeklyDebriefInputSchema = z.object({
  totalWeekHours: z.number().describe('Total focus hours in the last 7 days.'),
  pillarHours: z.object({
    capital: z.number(),
    professional: z.number(),
    vitality: z.number(),
    personal: z.number(),
  }).describe('Focus hours by pillar for the last 7 days.'),
  topAdvanced: z.array(z.object({
    name: z.string(),
    category: z.string(),
    hours: z.number(),
  })).describe('Top mandates by hours advanced this week.'),
  topDebt: z.array(z.object({
    name: z.string(),
    category: z.string(),
    debtHours: z.number(),
  })).describe('Top mandates by strategic debt (hours owed).'),
});
export type WeeklyDebriefInput = z.infer<typeof WeeklyDebriefInputSchema>;

const WeeklyDebriefOutputSchema = z.object({
  summary: z.string().optional().describe('Short council-style weekly report in English.'),
  error: z.string().optional().describe('Error code if the generation fails.'),
});
export type WeeklyDebriefOutput = z.infer<typeof WeeklyDebriefOutputSchema>;

export async function generateWeeklyDebrief(
  input: WeeklyDebriefInput
): Promise<WeeklyDebriefOutput> {
  try {
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENAI_API_KEY) {
      return { error: 'MISSING_API_KEY' };
    }
    return await weeklyDebriefFlow(input);
  } catch (e: any) {
    console.error('[WeeklyDebrief] flow error', e);
    return { error: 'UNKNOWN_ERROR' };
  }
}

const prompt = ai.definePrompt({
  name: 'weeklyDebriefPrompt',
  input: { schema: WeeklyDebriefInputSchema },
  prompt: `You are a Strategic Council analyzing the user's portfolio execution for the past week.

Week data (last 7 days):
- Total focus hours: {{totalWeekHours}}h
- Capital: {{pillarHours.capital}}h
- Professional: {{pillarHours.professional}}h
- Vitality: {{pillarHours.vitality}}h
- Personal: {{pillarHours.personal}}h

Top mandates that advanced the most (name, pillar, hours):
{{#each topAdvanced}}
- {{name}} ({{category}}): {{hours}}h
{{/each}}

Top mandates with highest strategic debt (name, pillar, debt hours):
{{#each topDebt}}
- {{name}} ({{category}}): {{debtHours}}h
{{/each}}

Write a short text in English (max 4 sentences), high-level council tone:
- Acknowledge where there was real progress.
- Point out coldly where risk is concentrated (strategic debt).
- Highlight 1 main focus for the next week.
- Be direct, executive, and free of motivational clichés.

Respond with only the final text (max 4 sentences), without re-explaining the numbers. No JSON, no labels—just the council's paragraph.`,
});

const weeklyDebriefFlow = ai.defineFlow(
  {
    name: 'weeklyDebriefFlow',
    inputSchema: WeeklyDebriefInputSchema,
    outputSchema: WeeklyDebriefOutputSchema,
  },
  async (input) => {
    try {
      const response = await prompt(input);
      if (response == null) return { error: 'NO_SUMMARY' };
      const r = response as { text?: string; output?: { summary?: string } };
      const text =
        (typeof r.text === 'string' ? r.text : null) ||
        (typeof r.output?.summary === 'string' ? r.output.summary : null) ||
        '';
      const summary = String(text).trim();
      if (summary) return { summary };
      return { error: 'NO_SUMMARY' };
    } catch (e: any) {
      if (e?.message?.includes('429') || e?.message?.includes('quota')) {
        return { error: 'QUOTA_EXCEEDED' };
      }
      console.error('[WeeklyDebrief] flow catch', e?.message ?? e);
      return { error: 'UNKNOWN_ERROR' };
    }
  }
);

