# Agent Notes

## Keyterm/Keywords Support

### Status Summary (2026-02-07)

| ASR Model | Keyterm Support | Method |
|-----------|-----------------|--------|
| Gemini | ✅ Works | Prompt injection |
| Deepgram Nova-3 | ❌ Disabled | API `keyterm` param unreliable |
| Google STT | ❌ Disabled | Speech adaptation unreliable |

### Security Measures (Prompt Injection Mitigation)

1. **Max 3 words per keyterm** - Validation in `App.tsx` rejects longer phrases
2. **Keyterms shuffled** - Fisher-Yates shuffle in `geminiTranscription.ts` before adding to prompt

### Implementation Details

**Gemini (Working):**
- Keyterms injected into prompt via `buildTranscriptionPrompt()`
- localStorage key: `asr_keyterms`

**Deepgram & Google STT (Disabled):**
- `supportsKeyterms` excludes these models
