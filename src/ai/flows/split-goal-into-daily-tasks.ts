
'use server';
/**
 * @fileOverview A Genkit flow for splitting a high-level goal into elite, actionable directives.
 * Optimized for a wealth management / prestige execution context with prioritization logic.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SplitGoalIntoDailyTasksInputSchema = z.object({
  goal: z
    .string()
    .describe('The strategic asset or goal to be broken down into daily directives.'),
});
export type SplitGoalIntoDailyTasksInput = z.infer<
  typeof SplitGoalIntoDailyTasksInputSchema
>;

const SplitGoalIntoDailyTasksOutputSchema = z.object({
  dailyTasks: z
    .array(z.object({
      title: z.string().describe('The directive description.'),
      priority: z.enum(['high', 'medium', 'low']).describe('The strategic impact of this directive.')
    }))
    .optional()
    .describe('A list of elite, actionable directives sorted by strategic impact.'),
  error: z.string().optional().describe('Error code if the generation fails.'),
});
export type SplitGoalIntoDailyTasksOutput = z.infer<
  typeof SplitGoalIntoDailyTasksOutputSchema
>;

export async function splitGoalIntoDailyTasks(
  input: SplitGoalIntoDailyTasksInput
): Promise<SplitGoalIntoDailyTasksOutput> {
  return splitGoalIntoDailyTasksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'splitGoalIntoDailyTasksPrompt',
  input: {schema: SplitGoalIntoDailyTasksInputSchema},
  output: {schema: SplitGoalIntoDailyTasksOutputSchema},
  prompt: `You are a high-level Human Capital Strategist and Legacy Manager.

Your task is to analyze the client's strategic asset and define daily execution directives that maximize return on time invested.

IMPORTANT: Classify each directive by its STRATEGIC IMPACT:
- 'high': Foundational actions that ensure asset progress. If the client has only 15 minutes, these are the actions that must be done.
- 'medium': Support and refinement actions.
- 'low': Long-term optimization actions.

Keep the tone sophisticated, executive, and direct. Each directive should be a clear step toward building lasting legacy.

Strategic Asset: {{{goal}}}`,
});

const splitGoalIntoDailyTasksFlow = ai.defineFlow(
  {
    name: 'splitGoalIntoDailyTasksFlow',
    inputSchema: SplitGoalIntoDailyTasksInputSchema,
    outputSchema: SplitGoalIntoDailyTasksOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      return output!;
    } catch (e: any) {
      if (e.message?.includes('429') || e.message?.includes('quota')) {
        return { error: 'QUOTA_EXCEEDED' };
      }
      return { error: 'UNKNOWN_ERROR' };
    }
  }
);
