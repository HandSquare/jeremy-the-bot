const OpenAI = require('openai');
const messageHistory = require('./messageHistory');

const configuration = {
  apiKey: process.env.OPENAI_API_KEY,
};
const openai = new OpenAI(configuration);

module.exports = async (event) => {
  if (!event || !event.text)
    return { respond: false, reason: 'no_text', confidence: 0 };
  if (event.subtype === 'bot_message')
    return { respond: false, reason: 'bot_message', confidence: 0 };

  const channelHistory = (messageHistory[event.channel] || [])
    .filter((m) => !!m && typeof m.text === 'string')
    .slice(0, 12)
    .reverse();

  const formattedHistory = channelHistory
    .map((m) => {
      const isBot = m.subtype === 'bot_message';
      const author = isBot ? 'Jeremy' : m.username || m.user || 'user';
      return `${author}: ${m.text}`;
    })
    .join('\n');

  const routingInstructions = [
    'You are a message router that decides if Jeremy, a helpful but chill assistant, should reply in a Slack channel.',
    'Return ONLY a compact JSON object, no prose, no code fences.',
    'Respond true only when there is a clear invitation or expectation for Jeremy to speak, or a natural follow-up to a conversation Jeremy has recently participated in.',
    'Prioritize not being too aggressive: default to false unless clearly warranted.',
    'Signals for true include: mentions like "let me ask jeremy", "i wonder what jeremy thinks", direct questions to jeremy, or a continuing thread where jeremy spoke recently.',
    'Weak signals or generic chat should result in false.',
    'JSON keys: respond (boolean), confidence (0-1 number), reason (short string).',
  ].join(' ');

  const input = `Conversation history (oldest to newest):\n${formattedHistory}\n\nCurrent message: ${event.text}\n`;

  let outputText = '';
  try {
    const response = await openai.responses.create({
      model: 'gpt-5-nano',
      instructions: routingInstructions,
      input,
    });
    outputText = (response && response.output_text) || '';
  } catch (e) {
    return {
      respond: false,
      reason: `api_error:${e.message}`.slice(0, 120),
      confidence: 0,
    };
  }

  const extractJson = (text) => {
    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        const jsonCandidate = text.slice(start, end + 1);
        return JSON.parse(jsonCandidate);
      }
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  };

  const parsed = extractJson(outputText);
  if (!parsed || typeof parsed.respond !== 'boolean') {
    return { respond: false, reason: 'unparsable_response', confidence: 0 };
  }

  return {
    respond: !!parsed.respond,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    reason: typeof parsed.reason === 'string' ? parsed.reason : 'no_reason',
  };
};
