const { Groq } = require('groq-sdk');
const apiKey = process.env.GROQ_API_KEY || '';
const groq = new Groq({ apiKey });

async function test() {
  const messages = [
    { role: 'system', content: 'You are J.A.R.V.I.S., a helpful AI assistant. Once a tool execution completes, you MUST reply with a brief vocal confirmation of what was accomplished (e.g. "YouTube opened, Sir."). Keep responses ultra-brief, smart, and concise (under 25 words).' },
    { role: 'user', content: 'Jarvis, open youtube.com' },
    {
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: 'call_123',
          type: 'function',
          function: { name: 'open_website', arguments: '{"url":"youtube.com"}' }
        }
      ]
    },
    { role: 'tool', tool_call_id: 'call_123', name: 'open_website', content: 'SUCCESS: Opened website youtube.com' }
  ];

  try {
    const res = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: messages
    });
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error(e);
  }
}

test();
