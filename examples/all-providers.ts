import { chromium } from 'playwright';
import { vibe } from '../src';
import 'dotenv/config';

/**
 * Example: Using All AI Providers
 *
 * Demonstrates how Vibe works with all 6 supported AI providers:
 * - OpenAI (GPT-4, GPT-4o-mini)
 * - Gemini (Google)
 * - Anthropic (Claude)
 * - DeepSeek
 * - Grok (xAI)
 * - Groq (Fast inference)
 */
async function main() {
  console.log('🎯 Vibe Framework - All AI Providers Demo\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // ============================================
    // Example 1: OpenAI (gpt-4o-mini) - Default
    // ============================================
    console.log('\n=== Example 1: OpenAI ===');
    if (process.env.OPENAI_API_KEY) {
      const session = vibe()
        .withPage(page)
        .withMode('smart-cache')
        .withAIProvider('OPENAI' as any, process.env.OPENAI_API_KEY)
        .withAIModel('gpt-4o-mini')  // Optional: override model
        .build();

      await session.goto('https://www.saucedemo.com');
      const answer = await session.ask('What is the page title?');
      console.log(`  Answer: ${answer}`);
    } else {
      console.log('  ⚠️ Skipped: OPENAI_API_KEY not set');
    }

    // ============================================
    // Example 2: Gemini (Google)
    // ============================================
    console.log('\n=== Example 2: Gemini ===');
    if (process.env.GEMINI_API_KEY) {
      const session = vibe()
        .withPage(page)
        .withMode('smart-cache')
        .withAIProvider('GEMINI' as any, process.env.GEMINI_API_KEY)
        .withAIModel('gemini-2.0-flash-exp')  // Optional
        .build();

      const answer = await session.ask('What is the main heading?');
      console.log(`  Answer: ${answer}`);
    } else {
      console.log('  ⚠️ Skipped: GEMINI_API_KEY not set');
    }

    // ============================================
    // Example 3: Anthropic (Claude)
    // ============================================
    console.log('\n=== Example 3: Anthropic (Claude) ===');
    if (process.env.ANTHROPIC_API_KEY) {
      const session = vibe()
        .withPage(page)
        .withMode('smart-cache')
        .withAIProvider('ANTHROPIC' as any, process.env.ANTHROPIC_API_KEY)
        .withAIModel('claude-3-5-sonnet-20241022')  // Optional
        .build();

      const answer = await session.ask('What is the page title?');
      console.log(`  Answer: ${answer}`);
    } else {
      console.log('  ⚠️ Skipped: ANTHROPIC_API_KEY not set');
    }

    // ============================================
    // Example 4: DeepSeek
    // ============================================
    console.log('\n=== Example 4: DeepSeek ===');
    if (process.env.DEEPSEEK_API_KEY) {
      const session = vibe()
        .withPage(page)
        .withMode('smart-cache')
        .withAIProvider('DEEPSEEK' as any, process.env.DEEPSEEK_API_KEY)
        .withAIModel('deepseek-chat')  // Optional
        .build();

      const answer = await session.ask('What is the page title?');
      console.log(`  Answer: ${answer}`);
    } else {
      console.log('  ⚠️ Skipped: DEEPSEEK_API_KEY not set');
    }

    // ============================================
    // Example 5: Grok (xAI)
    // ============================================
    console.log('\n=== Example 5: Grok (xAI) ===');
    if (process.env.GROK_API_KEY) {
      const session = vibe()
        .withPage(page)
        .withMode('smart-cache')
        .withAIProvider('GROK' as any, process.env.GROK_API_KEY)
        .withAIModel('grok-beta')  // Optional
        .build();

      const answer = await session.ask('What is the page title?');
      console.log(`  Answer: ${answer}`);
    } else {
      console.log('  ⚠️ Skipped: GROK_API_KEY not set');
    }

    // ============================================
    // Example 6: Groq (Fast Inference)
    // ============================================
    console.log('\n=== Example 6: Groq ===');
    if (process.env.GROQ_API_KEY) {
      const session = vibe()
        .withPage(page)
        .withMode('smart-cache')
        .withAIProvider('GROQ' as any, process.env.GROQ_API_KEY)
        .withAIModel('llama-3.3-70b-versatile')  // Optional
        .build();

      const answer = await session.ask('What is the page title?');
      console.log(`  Answer: ${answer}`);
    } else {
      console.log('  ⚠️ Skipped: GROQ_API_KEY not set');
    }

    // ============================================
    // Summary
    // ============================================
    console.log('\n=== Supported AI Providers ===');
    console.log('  ✅ OpenAI - GPT-4, GPT-4o-mini');
    console.log('  ✅ Gemini - Google Gemini 2.0 Flash');
    console.log('  ✅ Anthropic - Claude 3.5 Sonnet');
    console.log('  ✅ DeepSeek - DeepSeek Chat');
    console.log('  ✅ Grok - xAI Grok Beta');
    console.log('  ✅ Groq - Llama 3.3 70B (Fast inference)');
    console.log('\n  💡 All providers work for:');
    console.log('     - Element finding (AutoHeal)');
    console.log('     - Natural language parsing');
    console.log('     - Question answering (ask() method)');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
