# TTS Research (Issue #32)

## Background

The original `google-tts-api` npm package was removed due to security vulnerabilities in its dependencies. It was replaced with a direct axios call to the same endpoint it had been using (`translate.google.com/_/TranslateWebserverUi/data/batchexecute`). This resolved the security issue but left the underlying fragility intact - the endpoint is unofficial and undocumented.

Issue #32 was opened to track finding a more reliable replacement. This document captures the research and the decision made.

## Current Implementation

- `bot/commands/eightBallCommand.ts` calls the Google Translate internal batch endpoint via axios
- Responses are MD5-hashed and cached permanently as MP3 files in `local-cache/audio/8ball/`
- The overlay server (`bot/overlay/overlay.server.ts`) serves the cached files to OBS browser sources
- There are 20 fixed responses - each is only ever generated once, then served from cache

The caching strategy means the fragile endpoint is almost never hit in practice after initial warmup.

## Alternatives Evaluated

**Official Google Cloud TTS**
- Direct upgrade path - same voice family, official API with SLA
- Free tier (1M chars/month) makes it effectively free for this use case
- Requires a Google Cloud project and API key/service account
- Strongest option if the endpoint breaks and a replacement is needed

**Microsoft Edge TTS (`msedge-tts` npm)**
- Connects to Microsoft's cloud TTS service directly - no Edge browser required on the host
- Neural voice quality is noticeably better than Google Translate's voice
- Free, no account needed
- Still unofficial, but more stable in practice than the Google Translate endpoint

**ElevenLabs**
- Best voice quality available
- Free tier (10k chars/month) covers this use case entirely
- Requires an account and API key
- Good foundation if TTS usage expands to other commands

**OpenAI TTS**
- Reliable official API, six voice options
- Trivially cheap for this use case (less than $0.01 total lifetime at current scale)
- Requires an OpenAI API key

**Local TTS (Piper, Coqui)**
- No external network dependency at runtime
- Piper is the most practical option - fast, CPU-only, installable as a binary in the Docker image
- Voice quality is below cloud options
- Adds infrastructure complexity (binary + voice model download in Dockerfile) not justified by the current use case

## Decision

Issue closed without replacing the current implementation. Reasons:

- The caching strategy means the unofficial endpoint is rarely called
- The 8ball command is a novelty feature, not load-bearing
- All viable alternatives add account dependencies, infrastructure complexity, or setup overhead that outweighs the benefit at current scale
- The acute pain (broken library) was already resolved

If the Google Translate endpoint breaks again, the shortlist above - particularly Official Google Cloud TTS or Edge TTS - provides a clear starting point. The investigation is done; it just needs execution at that point.
