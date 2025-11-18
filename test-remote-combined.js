#!/usr/bin/env node

/**
 * Test Combined Search on Remote Server
 * Sends "Was steht im Tagungsband?" to the server and checks logs
 */

const axios = require('axios');

const SERVER = 'http://10.0.0.2:4100';
const CHAT_ID = '2f54539a-72aa-46de-83db-a778b3253666'; // Your existing chat

async function testRemoteCombinedSearch() {
  console.log('🧪 Testing Combined Search on Remote Server');
  console.log('============================================\n');

  try {
    // Note: This will fail without authentication, but we can check server logs
    console.log(`📤 Sending request to: ${SERVER}/api/chat/chats/${CHAT_ID}/messages`);
    console.log(`   Query: "Was steht im Tagungsband?"\n`);

    const response = await axios.post(
      `${SERVER}/api/chat/chats/${CHAT_ID}/messages`,
      {
        content: 'Was steht im Tagungsband?',
        contextSettings: {}
      },
      {
        headers: {
          'Content-Type': 'application/json',
          // You would need authentication token here
        },
        timeout: 30000
      }
    );

    console.log('✅ Response received:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    if (error.response) {
      console.log(`❌ Server responded with ${error.response.status}: ${error.response.statusText}`);
      if (error.response.status === 401 || error.response.status === 403) {
        console.log('\n⚠️  This is expected - authentication required');
        console.log('   But the request should have triggered server-side logging');
      } else {
        console.log('Response data:', error.response.data);
      }
    } else if (error.request) {
      console.log('❌ No response received from server');
      console.log('   Error:', error.message);
    } else {
      console.log('❌ Error:', error.message);
    }
  }

  console.log('\n📊 Now check server logs with:');
  console.log('   ssh root@10.0.0.2 "pm2 logs willi_mako_backend_4101 --lines 50"');
  console.log('\n   Look for:');
  console.log('   - 🔎 AdvancedRetrieval: useCombinedSearch=true');
  console.log('   - 🔍 Combined Search: Query="Was steht im Tagungsband?"');
  console.log('   - 📊 Results: willi_mako=X, willi-netz=Y');
}

testRemoteCombinedSearch()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
