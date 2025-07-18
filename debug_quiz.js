const axios = require('axios');

// Test quiz endpoint
async function testQuizEndpoint() {
  try {
    // Versuche, den Quiz-Endpoint ohne Auth zu erreichen
    console.log('Testing quiz endpoint without auth...');
    const response = await axios.get('http://localhost:3003/api/quiz/quizzes');
    console.log('Response:', response.data);
  } catch (error) {
    console.log('Error Status:', error.response?.status);
    console.log('Error Message:', error.response?.data?.message || error.message);
    console.log('Error Headers:', error.response?.headers);
  }
  
  try {
    // Teste auch einen anderen Endpoint
    console.log('\nTesting health endpoint...');
    const healthResponse = await axios.get('http://localhost:3003/api/health');
    console.log('Health Response:', healthResponse.data);
  } catch (error) {
    console.log('Health Error:', error.message);
  }
}

testQuizEndpoint();
