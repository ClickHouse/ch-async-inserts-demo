const inserts = {
  connection: {
    address: 'http://127.0.0.1:8123',
    user: 'default',
  },
  database: 'default',
  table: 'sample_table',
  data: [
    { col1:  1 },
    { col1:  2 },
    { col1:  3 },
    { col1:  4 },
    { col1:  5 },
    { col1:  6 },
    { col1:  7 },
    { col1:  8 }
  ]
}
fetch('http://localhost:8080/insert', {
  method: 'POST',
  body: JSON.stringify(inserts),
  headers: {
    'Content-Type': 'application/json'
  }
}).then(response => response.json()).then(console.log).catch(console.error);

