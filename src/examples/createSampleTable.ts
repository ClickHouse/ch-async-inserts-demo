console.log('Creating sample table');

const request = {
  connection: {
    address: 'http://127.0.0.1:8123',
    user: 'default',
  },
  database: 'default',
  table: 'sample_table',
  columns: [{
    name: 'col1',
    type: 'UInt8'
  }],
  sortKey: 'col1'
}
fetch('http://localhost:8080/create-table', {
  method: 'POST',
  body: JSON.stringify(request),
  headers: {
    'Content-Type': 'application/json'
  }
}).then(response => response.json()).then(console.log).catch(console.error);

