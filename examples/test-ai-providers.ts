import { chromium } from 'playwright';
import { vibe } from '../src';
import 'dotenv/config';

/**
 * Test all AI providers for command parsing
 *
 * This test demonstrates that all AI providers can successfully parse
 * natural language commands into structured actions.
 */
async function testProvider(
  name: string,
  provider: string,
  apiKey: string | undefined,
  model?: string
) {
  if (!apiKey) {
    console.log(`  ⚠️  ${name}: Skipped (API key not set)`);
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const session = vibe()
      .withPage(page)
      .withMode('smart-cache')
      .withAIProvider(provider as any, apiKey)
      .withAIModel(model)
      .build();

    // Navigate to test page
    await page.goto('https://www.saucedemo.com');

    // Test command parsing
    console.log(`  🔍 ${name}: Testing command parsing...`);

    // Test 1: Click action
    await session.do('click the login button');
    console.log(`  ✅ ${name}: Click action parsed successfully`);

    // Test 2: Fill action with value extraction
    await session.do('type standard_user into the username field');
    console.log(`  ✅ ${name}: Fill action parsed successfully`);

    await browser.close();
    console.log(`  ✓  ${name}: All tests passed!\n`);
  } catch (error: any) {
    await browser.close();
    console.log(`  ❌ ${name}: Failed - ${error.message}\n`);
  }
}

async function main() {
  console.log('🎯 Vibe Framework - AI Provider Command Parsing Test\n');
  console.log('Testing all AI providers for natural language command parsing...\n');

  // Test all providers
  await testProvider(
    'OpenAI (GPT-4o-mini)',
    'OPENAI',
    process.env.OPENAI_API_KEY,
    'gpt-4o-mini'
  );

  await testProvider(
    'Gemini (2.0 Flash)',
    'GEMINI',
    process.env.GEMINI_API_KEY,
    'gemini-2.0-flash-exp'
  );

  await testProvider(
    'Anthropic (Claude 3.5)',
    'ANTHROPIC',
    process.env.ANTHROPIC_API_KEY,
    'claude-3-5-sonnet-20241022'
  );

  await testProvider(
    'DeepSeek (Chat)',
    'DEEPSEEK',
    process.env.DEEPSEEK_API_KEY,
    'deepseek-chat'
  );

  await testProvider(
    'Groq (Llama 3.3)',
    'GROQ',
    process.env.GROQ_API_KEY,
    'llama-3.3-70b-versatile'
  );

  console.log('\n=== Summary ===');
  console.log('All configured AI providers have been tested for command parsing.');
  console.log('\nSupported Providers:');
  console.log('  ✅ OpenAI - GPT-4, GPT-4o, GPT-4o-mini');
  console.log('  ✅ Gemini - Google Gemini 2.0 Flash');
  console.log('  ✅ Anthropic - Claude 3.5 Sonnet, Claude 3 Opus');
  console.log('  ✅ DeepSeek - DeepSeek Chat');
  console.log('  ✅ Groq - Llama 3.3 70B (Extremely fast)');
  console.log('  ⚠️  Grok - Not yet implemented (use GROQ for Llama models)');
  console.log('\nAll providers support:');
  console.log('  • Natural language command parsing');
  console.log('  • Element finding with AutoHeal');
  console.log('  • Smart caching for performance');
}

main().catch(console.error);
