const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function testOpenRouterFixed() {
  console.log('🔍 Testing OpenRouter API with corrected headers\n');
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No OpenRouter API key found');
    return;
  }
  
  try {
    console.log('🧪 Testing completion with proper headers');
    
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'google/gemma-3-4b-it',
      messages: [
        {
          role: 'system',
          content: 'You are a YouTube metadata extractor. Extract data and return JSON only.'
        },
        {
          role: 'user',
          content: 'Extract metadata from this: <title>Rick Astley - Never Gonna Give You Up (Official Music Video)</title>'
        }
      ],
      max_tokens: 500,
      temperature: 0.1
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://rabbit-analytics.com',
        'X-Title': process.env.OPENROUTER_TITLE || 'Rabbit YouTube Analytics'
      },
      timeout: 30000
    });
    
    console.log('✅ OpenRouter API call successful!');
    console.log('Response content:', response.data.choices[0]?.message?.content || 'No content');
    console.log('Usage:', response.data.usage);
    console.log('Cost estimate: $', (response.data.usage?.total_tokens * 0.00000002).toFixed(6));
    
    // Now test the actual LLM scraping endpoint
    console.log('\n🧪 Testing backend LLM endpoint...');
    
    const backendResponse = await axios.post('http://localhost:5000/api/llm-scraping/scrape', {
      videoIds: ['dQw4w9WgXcQ'],
      config: {
        provider: 'google',
        model: 'gemma-3-4b-it',
        maxTokens: 2000,
        temperature: 0.1,
        costLimit: 0.10
      }
    }, {
      timeout: 60000
    });
    
    console.log('✅ Backend LLM endpoint successful!');
    console.log('Response:', JSON.stringify(backendResponse.data, null, 2));
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Data:`, JSON.stringify(error.response.data, null, 2));
    }
    
    // If the direct call failed, let's try to see backend logs
    if (error.config && error.config.url && error.config.url.includes('localhost')) {
      console.log('\n🔍 Backend might not be ready. Let me check health...');
      try {
        const health = await axios.get('http://localhost:5000/health', { timeout: 5000 });
        console.log('Backend health:', health.data);
      } catch (healthError) {
        console.log('Backend health check failed:', healthError.message);
      }
    }
  }
}

testOpenRouterFixed();