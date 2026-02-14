const http = require('http');

console.log('🔄 Starting API test...');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/product/vendor/69627a5611f9ee14966d6be1',
  method: 'GET'
};

console.log('📡 Connecting to:', options.hostname + ':' + options.port + options.path);

const req = http.request(options, (res) => {
  console.log('📊 Response Status:', res.statusCode);
  
  let data = '';
  
  res.on('data', chunk => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📦 Received', data.length, 'bytes');
    try {
      const products = JSON.parse(data);
      console.log('\n✅ API TEST SUCCESS!');
      console.log('Found', products.length, 'products');
      console.log('\nProducts:');
      products.forEach(p => {
        console.log(`  📦 ${p.name} - ₹${p.price} (Stock: ${p.stock})`);
      });
      process.exit(0);
    } catch(e) {
      console.log('❌ Error parsing response:', e.message);
      console.log('Response data:', data.substring(0, 500));
      process.exit(1);
    }
  });
});

req.on('error', e => {
  console.log('❌ Connection Error:', e.code, '-', e.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.log('❌ Request Timeout');
  process.exit(1);
});

req.setTimeout(5000);
req.end();
