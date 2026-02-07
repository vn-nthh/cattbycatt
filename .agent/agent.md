# Agent Notes

## Disabled Features

### Keyterm/Keywords Support (Disabled 2026-02-07)

**Status:** Disabled for all ASR models

**Reason:** Neither Deepgram nor Google STT keyterm APIs work reliably.

**Details:**
- Deepgram Nova-3 `keyterm` parameter doesn't improve recognition of specified terms
- Google STT speech adaptation/phrase hints also unreliable
- UI code for keyterms still exists in `App.tsx` but `supportsKeyterms` is set to `false`
- localStorage key `asr_keyterms` is used but never populated since feature is disabled

**Future Work:**
- Re-test keyterm support when Deepgram/Google update their APIs
- Consider alternative approaches like post-processing with find/replace
