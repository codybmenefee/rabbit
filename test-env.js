#!/usr/bin/env node

/**
 * Test environment variable loading
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

console.log('🔍 Environment Variable Check:');
console.log('');

console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? `✅ Present (${process.env.OPENROUTER_API_KEY.substring(0, 20)}...)` : '❌ Missing');
console.log('OPENROUTER_REFERER:', process.env.OPENROUTER_REFERER ? `✅ Present (${process.env.OPENROUTER_REFERER})` : '❌ Missing');
console.log('OPENROUTER_TITLE:', process.env.OPENROUTER_TITLE ? `✅ Present (${process.env.OPENROUTER_TITLE})` : '❌ Missing');
console.log('LLM_SCRAPING_ENABLED:', process.env.LLM_SCRAPING_ENABLED ? `✅ Present (${process.env.LLM_SCRAPING_ENABLED})` : '❌ Missing');
console.log('LLM_PROVIDER:', process.env.LLM_PROVIDER ? `✅ Present (${process.env.LLM_PROVIDER})` : '❌ Missing');
console.log('LLM_MODEL:', process.env.LLM_MODEL ? `✅ Present (${process.env.LLM_MODEL})` : '❌ Missing');

console.log('');
console.log('🔧 Backend environment path check:');
console.log('Current working directory:', process.cwd());
console.log('Expected .env path:', require('path').join(__dirname, '.env'));

// Test if we can make a simple request to OpenRouter
const axios = require('axios');

async function testOpenRouterConnection() {
  console.log('');
  console.log('🌐 Testing OpenRouter API connection...');
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log('❌ No API key to test with');
    return;
  }
  
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://rabbit-analytics.com',
        'X-Title': process.env.OPENROUTER_TITLE || 'Rabbit YouTube Analytics'
      },
      timeout: 10000
    });
    
    console.log('✅ OpenRouter API connection successful');
    console.log(`✅ Available models: ${response.data.data ? response.data.data.length : 'Unknown'}`);
    
    // Check if our model is available
    if (response.data.data) {
      const ourModel = 'google/gemma-3-4b-it';
      const modelExists = response.data.data.some(model => model.id === ourModel);
      console.log(`✅ Our model (${ourModel}): ${modelExists ? 'Available' : 'Not found'}`);
    }
    
  } catch (error) {
    console.log(`❌ OpenRouter API test failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

testOpenRouterConnection().catch(console.error);