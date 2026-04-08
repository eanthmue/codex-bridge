import http from 'http';
import fs from 'fs';

let output = [];

const req = http.get('http://localhost:3000/api/stream', (res) => {
  res.on('data', (chunk) => {
    output.push(chunk.toString());
  });
});

setTimeout(async () => {
  const res1 = await fetch('http://localhost:3000/api/session', { method: 'POST' });
  const data1 = await res1.json();
  if (data1.thread?.id) {
    await fetch('http://localhost:3000/api/task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: data1.thread.id, text: "say hi" })
    });
  }
}, 1000);

setTimeout(() => {
  req.abort();
  fs.writeFileSync('out.json', JSON.stringify(output, null, 2));
  process.exit(0);
}, 5000);
