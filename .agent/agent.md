# Agent Notes

## Keyterm/Keywords Support

### Status Summary (2026-02-07)

| ASR Model | Keyterm Support | Method |
|-----------|-----------------|--------|
| Gemini | ✅ Works | Prompt injection |
| Deepgram Nova-3 | ❌ Disabled | API `keyterm` param unreliable |
| Google STT | ❌ Disabled | Speech adaptation unreliable |

### Implementation Details

**Gemini (Working):**
- Keyterms are injected into the transcription prompt
- See `convex/geminiTranscription.ts` - `buildTranscriptionPrompt()` function
- localStorage key: `asr_keyterms`

**Deepgram & Google STT (Disabled):**
- Code exists but `supportsKeyterms` excludes these models
- Re-test when APIs improve
