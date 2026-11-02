// Which brain runs is one line in config.json:
//   "brain": "auto"       api if ANTHROPIC_API_KEY is set, else scripted
//   "brain": "anthropic"  api, fails loudly without a key
//   "brain": "scripted"   rules and templates, no key, free

import { makeScriptedBrain } from './scripted.js';

export async function makeBrain(config) {
  const want = config.brain || 'auto';
  const hasKey = !!process.env.ANTHROPIC_API_KEY;

  if (want === 'scripted' || (want === 'auto' && !hasKey)) {
    return makeScriptedBrain();
  }
  if (!hasKey) throw new Error('brain is "anthropic" but ANTHROPIC_API_KEY is not set');
  const { makeAnthropicBrain } = await import('./anthropic.js');
  return makeAnthropicBrain(config);
}
