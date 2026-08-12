const http = require('http');

const data = JSON.stringify({
  name: 'TestSuburb',
  town_id: 1
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/settings/suburbs',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('POST res:', res.statusCode, body));
});
req.on('error', e => console.error(e));
req.write(data);
req.end();

setTimeout(() => {
  http.get('http://localhost:5000/api/settings/suburbs', res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => console.log('GET res:', res.statusCode, body));
  });
}, 1000);
