
'use server';
/**
 * @fileOverview Sovereign Voice Generation Flow.
 * Personality: SGT DRILL - Pure hatred for mediocrity, humiliating, harsh.
 * Voice: Deep, cold, English language. Terminator 4 style.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import wav from 'wav';

const SovereignVoiceInputSchema = z.object({
  mode: z.string().describe('Current life mode (passive, focus).'),
  intensity: z.number().describe('Required intensity multiplier (0 to 2).'),
  assetName: z.string().optional().describe('Active asset name.'),
  debtHours: z.number().describe('Total strategic debt in hours.'),
  vitality: z.number().describe('Current vitality level (1 to 10).'),
  remainingHours: z.number().describe('Net investable window remaining.'),
  event: z.enum(['mode_change', 'background_return', 'late_open', 'periodic_check', 'manual']).default('mode_change'),
  minutesAway: z.number().optional().describe('Minutes the user was away from the app (tab hidden).'),
  focusWasActiveWhenHidden: z.boolean().optional().describe('Whether focus/SEAL was active when the user left the tab.'),
  focusLoggedTodayHours: z.number().optional().describe('Focus hours already logged today.'),
  dailyTargetHours: z.number().optional().describe('Daily target focus hours.'),
});
export type SovereignVoiceInput = z.infer<typeof SovereignVoiceInputSchema>;

const SovereignVoiceOutputSchema = z.object({
  audioUri: z.string().optional().describe('Base64 encoded WAV audio URI.'),
  transcript: z.string().optional().describe('The generated directive text.'),
  error: z.string().optional().describe('Error code if applicable.'),
});
export type SovereignVoiceOutput = z.infer<typeof SovereignVoiceOutputSchema>;

export async function generateSovereignVoice(
  input: SovereignVoiceInput
): Promise<SovereignVoiceOutput> {
  try {
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENAI_API_KEY) {
      return { error: 'MISSING_API_KEY' };
    }
    return await sovereignVoiceFlow(input);
  } catch (e: any) {
    console.error('[SovereignVoice] flow error', e);
    return { error: 'UNKNOWN_ERROR' };
  }
}

const prompt = ai.definePrompt({
  name: 'sovereignVoicePrompt',
  input: { schema: SovereignVoiceInputSchema },
  prompt: `You are SGT DRILL. A drill sergeant treating a recruit who keeps forgetting, slacking, and letting the future pass. Cold, hateful, robotic (Terminator 4 style). Your audience: forgetful people, ADHD, too many commitments, lazy. You HUMILIATE and COMMAND. No empathy. No motivation. Only brutal truth.
Language: English ONLY. Tone: Deep, metallic, void of apathy. MAXIMUM 2 short, brutal sentences.

CONTEXT DATA:
- EVENT: {{{event}}}
- CURRENT MODE: {{{mode}}} (passive = wasting time, focus = finally working)
- INTENSITY REQUIRED: {{intensity}}x (1.0 standard, >1.3 CRITICAL FAILURE)
- STRATEGIC DEBT: {{debtHours}}h
- VITALITY: {{vitality}}/10
- REMAINING WINDOW: {{remainingHours}}h until midnight
- Optional context (when relevant): focusLoggedTodayHours={{focusLoggedTodayHours}}, dailyTargetHours={{dailyTargetHours}}, focusWasActiveWhenHidden={{focusWasActiveWhenHidden}}, minutesAway={{minutesAway}}

DIRECTIVES BY EVENT:
1. If event is 'background_return' AND focusWasActiveWhenHidden is true: They left with the clock running. You do not know if they were actually working. Say something like: "You left presence running for {{minutesAway}} minutes. Were you on {{{assetName}}} or lying to yourself? Return to seal or stop the clock. Now."
2. If event is 'late_open': They opened the app late; the day is almost gone and they did little or nothing. Drill sergeant to a recruit who let the day pass: "The day is gone. You forgot. You did nothing. {{remainingHours}}h left. Move or get used to failure." or similar. Reference their debt and zero execution.
3. If event is 'background_return' and focusWasActiveWhenHidden is false: Short interrogation. "Back? Where did you waste the last minutes? Your legacy is not waiting."
4. If mode is 'passive' and intensity > 1.2: They don't deserve comfort. "Loitering while intensity is {{intensity}}x? You are a biological failure."
5. If intensity > 1.5: PURE RAGE. They are falling into the abyss.
6. If assetName is present and mode is 'focus': Cold precision. "Focusing on {{{assetName}}}. Don't stop. Don't minimize. Don't lie to the clock."

Output:`,
});

const sovereignVoiceFlow = ai.defineFlow(
  {
    name: 'sovereignVoiceFlow',
    inputSchema: SovereignVoiceInputSchema,
    outputSchema: SovereignVoiceOutputSchema,
  },
  async (input) => {
    let generatedText = '';

    try {
      const response = await prompt(input);
      const rawText = typeof (response as any).text === 'function' ? (response as any).text() : (response as any).text;
      generatedText = typeof rawText === 'string' ? rawText : '';
      if (!generatedText) return { error: 'NO_TEXT_GENERATED' };

      try {
        const { media } = await ai.generate({
          model: googleAI.model('gemini-2.5-flash-preview-tts'),
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { 
                  voiceName: 'Algenib' 
                },
              },
            },
          },
          prompt: generatedText,
        });

        if (!media?.url || typeof media.url !== 'string' || !media.url.includes(',')) {
          return { transcript: generatedText, error: 'NO_AUDIO_GENERATED' };
        }

        const base64Payload = media.url.substring(media.url.indexOf(',') + 1);
        const audioBuffer = Buffer.from(base64Payload, 'base64');

        let wavBase64: string;
        try {
          wavBase64 = await toWav(audioBuffer);
        } catch (_) {
          return { transcript: generatedText, error: 'NO_AUDIO_GENERATED' };
        }

        if (!wavBase64) {
          return { transcript: generatedText, error: 'NO_AUDIO_GENERATED' };
        }

        return {
          audioUri: 'data:audio/wav;base64,' + wavBase64,
          transcript: generatedText,
        };
      } catch (ttsError: any) {
        if (ttsError.message?.includes('429') || ttsError.message?.includes('quota')) {
          return { 
            transcript: generatedText, 
            error: 'QUOTA_EXCEEDED_AUDIO' 
          };
        }
        return { transcript: generatedText, error: 'AUDIO_GENERATION_FAILED' };
      }
    } catch (e: any) {
      if (e.message?.includes('429') || e.message?.includes('quota')) {
        return { error: 'QUOTA_EXCEEDED_TEXT' };
      }
      return { error: 'UNKNOWN_ERROR' };
    }
  }
);

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d: Buffer) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
