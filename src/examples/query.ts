fetch('http://localhost:8080/query', {
  method: 'POST',
  body: JSON.stringify({
    connection: {
      address: 'http://127.0.0.1:8123',
      user: 'default',
    },
    query: 'SELECT * FROM default.sample_table',
  }),
  headers: {
    'Content-Type': 'application/json'
  }
}).then(response => response.json()).then(console.log).catch(console.error);

