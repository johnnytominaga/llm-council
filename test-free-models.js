#!/usr/bin/env node
/**
 * Test script to find working free models on OpenRouter
 * Usage: node test-free-models.js
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('Error: OPENROUTER_API_KEY not set');
  console.error('Set it in your .env.local file or run:');
  console.error('  export OPENROUTER_API_KEY=your_key_here');
  process.exit(1);
}

// Models to test
const FREE_MODELS_TO_TEST = [
  'meta-llama/llama-3.2-3b-instruct:free',
  'meta-llama/llama-3.2-1b-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free',
  'google/gemini-flash-1.5:free',
  'google/gemini-2.0-flash-exp:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'mistralai/mistral-7b-instruct:free',
  'liquid/lfm-40b:free',
];

async function testModel(model) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.choices && data.choices[0]) {
        return { model, status: '✅ WORKING', response: data.choices[0].message.content.substring(0, 50) };
      }
    }

    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.error?.message || errorData.message || response.statusText;
    return { model, status: `❌ ${response.status}`, error: errorMsg };
  } catch (error) {
    return { model, status: '❌ ERROR', error: error.message };
  }
}

async function testAllModels() {
  console.log('Testing free models on OpenRouter...\n');
  console.log('This will make', FREE_MODELS_TO_TEST.length, 'API requests.\n');

  const results = [];

  for (const model of FREE_MODELS_TO_TEST) {
    process.stdout.write(`Testing ${model}... `);
    const result = await testModel(model);
    console.log(result.status);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
    results.push(result);

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');

  const working = results.filter(r => r.status === '✅ WORKING');
  const failed = results.filter(r => r.status !== '✅ WORKING');

  console.log('✅ Working models (' + working.length + '):');
  working.forEach(r => console.log('  - ' + r.model));

  console.log('\n❌ Failed models (' + failed.length + '):');
  failed.forEach(r => console.log('  - ' + r.model + ' (' + r.error + ')'));

  if (working.length >= 2) {
    console.log('\n' + '='.repeat(80));
    console.log('RECOMMENDED CONFIG');
    console.log('='.repeat(80));
    console.log('\nAdd these to lib/config.ts:\n');
    console.log('export const COUNCIL_MODELS = [');
    working.slice(0, 2).forEach((r, i) => {
      console.log(`  "${r.model}",`);
    });
    console.log('];\n');
    console.log(`export const CHAIRMAN_MODEL = "${working[0].model}";\n`);
  }
}

testAllModels().catch(console.error);
