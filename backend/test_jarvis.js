async function runQuery(prompt) {
  console.log('--- Querying:', prompt);
  try {
    const res = await fetch('http://localhost:5000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        model: 'openai/gpt-oss-20b'
      })
    });
    const text = await res.text();
    console.log('Output chunks:');
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        const data = JSON.parse(line.slice(6));
        const content = data.choices?.[0]?.delta?.content;
        if (content) {
          process.stdout.write(content);
        }
      }
    }
    console.log('\n-----------------------\n');
  } catch (err) {
    console.error('Query failed:', err.message);
  }
}

async function start() {
  await runQuery('open Spotify');
}

start();













