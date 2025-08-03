const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function testOpenRouter() {
  console.log('🔍 Testing OpenRouter API directly\n');
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  console.log('API Key:', apiKey ? `Present (${apiKey.substring(0, 20)}...)` : 'MISSING');
  
  if (!apiKey) {
    console.log('❌ No OpenRouter API key found');
    return;
  }
  
  try {
    // Test 1: Check if we can access the API
    console.log('\n🧪 Test 1: API Authentication');
    const modelsResponse = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://rabbit-analytics.com',
        'X-Title': process.env.OPENROUTER_TITLE || 'Rabbit YouTube Analytics'
      },
      timeout: 10000
    });
    
    console.log('✅ API authentication successful');
    console.log(`✅ Available models: ${modelsResponse.data.data.length}`);
    
    // Test 2: Check if our specific model is available
    console.log('\n🧪 Test 2: Model Availability');
    const ourModel = 'google/gemma-3-4b-it';
    const modelExists = modelsResponse.data.data.some(model => model.id === ourModel);
    console.log(`Model ${ourModel}: ${modelExists ? '✅ Available' : '❌ Not found'}`);
    
    // Test 3: Try a simple completion
    console.log('\n🧪 Test 3: Simple API Call');
    const completionResponse = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: ourModel,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Respond with exactly "TEST_SUCCESS" and nothing else.'
        },
        {
          role: 'user',
          content: 'Please respond with the test phrase.'
        }
      ],
      max_tokens: 10,
      temperature: 0
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://rabbit-analytics.com',
        'X-Title': process.env.OPENROUTER_TITLE || 'Rabbit YouTube Analytics'
      },
      timeout: 30000
    });
    
    console.log('✅ API call successful');
    console.log('Response:', completionResponse.data.choices[0]?.message?.content || 'No content');
    console.log('Usage:', completionResponse.data.usage);
    
    console.log('\n🎉 All OpenRouter tests passed! The API key is working correctly.');
    
  } catch (error) {
    console.log(`❌ OpenRouter test failed: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Data:`, JSON.stringify(error.response.data, null, 2));
    }
  }
}

testOpenRouter();