import http from 'http';

const req = http.get('http://localhost:3000/api/stream', (res) => {
  console.log('Stream connected', res.statusCode);
  res.on('data', (chunk) => {
    console.log('STREAM DATA:', chunk.toString());
  });
});

setTimeout(async () => {
  console.log('Sending session request...');
  const res1 = await fetch('http://localhost:3000/api/session', { method: 'POST' });
  const data1 = await res1.json();
  console.log('Session result:', data1);

  if (data1.thread?.id) {
    console.log('Sending task request...');
    const res2 = await fetch('http://localhost:3000/api/task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: data1.thread.id, text: "hello" })
    });
    const data2 = await res2.json();
    console.log('Task result:', data2);
  }
}, 2000);

setTimeout(() => {
  req.abort();
  process.exit(0);
}, 6000);
