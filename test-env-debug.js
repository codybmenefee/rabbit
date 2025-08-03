#!/usr/bin/env node

const axios = require('axios');

async function debugEnvironmentVariables() {
  console.log('🔍 Testing Environment Variables and OpenRouter Configuration\n');
  
  try {
    // Test the backend's config endpoint to see what it's actually using
    console.log('1. Testing backend LLM config endpoint...');
    
    const configResponse = await axios.get('http://localhost:5000/api/llm-scraping/config');
    console.log('✅ Backend config response:');
    console.log(JSON.stringify(configResponse.data, null, 2));
    
    // Test OpenRouter API directly with the key from our main .env
    console.log('\n2. Testing OpenRouter API directly with our API key...');
    
    // Load the .env file from the root
    require('dotenv').config({ path: require('path').join(__dirname, '.env') });
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    console.log(`API Key from root .env: ${apiKey ? `Present (${apiKey.substring(0, 20)}...)` : 'MISSING'}`);
    
    if (apiKey) {
      console.log('\n3. Testing direct OpenRouter API call...');
      
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'google/gemma-3-4b-it',
        messages: [
          {
            role: 'system',
            content: 'Return exactly "API_TEST_SUCCESS" and nothing else.'
          },
          {
            role: 'user',
            content: 'Test'
          }
        ],
        max_tokens: 10,
        temperature: 0
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://rabbit-analytics.com',
          'X-Title': 'Rabbit YouTube Analytics'
        },
        timeout: 30000
      });
      
      console.log('✅ Direct OpenRouter API call successful!');
      console.log('Response:', response.data.choices[0]?.message?.content);
      console.log('Usage:', response.data.usage);
      
      // Now let's test with the exact same headers the backend should be using
      console.log('\n4. Testing with backend header format...');
      
      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://rabbit-analytics.com',
        'X-Title': process.env.OPENROUTER_TITLE || 'Rabbit YouTube Analytics'
      };
      
      console.log('Headers being sent:', headers);
      
      const response2 = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'google/gemma-3-4b-it',
        messages: [
          {
            role: 'system',
            content: 'Return exactly "BACKEND_HEADER_TEST_SUCCESS" and nothing else.'
          },
          {
            role: 'user',
            content: 'Test'
          }
        ],
        max_tokens: 10,
        temperature: 0
      }, {
        headers,
        timeout: 30000
      });
      
      console.log('✅ Backend header format test successful!');
      console.log('Response:', response2.data.choices[0]?.message?.content);
      
      console.log('\n🎉 OpenRouter API key is working correctly!');
      console.log('The issue must be in how the backend is loading or using the key.');
      
    } else {
      console.log('❌ No API key found in root .env file');
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response:`, JSON.stringify(error.response.data, null, 2));
    }
    if (error.config) {
      console.log(`   Headers sent:`, error.config.headers);
    }
  }
}

debugEnvironmentVariables();