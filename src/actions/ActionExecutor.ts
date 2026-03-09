import { Locator, Page } from 'playwright';
import { VibeCommand } from '../models/VibeCommand';
import { VibeResult } from '../models/VibeResult';
import { ActionType } from '../models/ActionType';

/**
 * Executes actions on Playwright locators
 */
export class ActionExecutor {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Execute a command on a locator
   */
  async execute(command: VibeCommand, locator: Locator): Promise<VibeResult> {
    const startTime = Date.now();

    try {
      let extractedValue: string | null | undefined;
      let verified: boolean | undefined;

      switch (command.action) {
        case ActionType.CLICK:
          await this.executeClick(locator, command);
          break;

        case ActionType.FILL:
          await this.executeFill(locator, command);
          break;

        case ActionType.SELECT:
          await this.executeSelect(locator, command);
          break;

        case ActionType.VERIFY:
        case ActionType.CHECK:
          verified = await this.executeVerify(locator, command);
          break;

        case ActionType.HOVER:
          await this.executeHover(locator, command);
          break;

        case ActionType.EXTRACT:
          extractedValue = await this.executeExtract(locator, command);
          break;

        case ActionType.WAIT:
          await this.executeWait(locator, command);
          break;

        default:
          throw new Error(`Unsupported action type: ${command.action}`);
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        command,
        executionTime,
        extractedValue,
        verified,
        metadata: {}
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        command,
        executionTime,
        error: error.message,
        stackTrace: error.stack
      };
    }
  }

  /**
   * Execute CLICK action
   */
  private async executeClick(locator: Locator, command: VibeCommand): Promise<void> {
    const timeout = command.parameters?.timeout || 10000;

    // Wait for element to be visible and enabled
    await locator.waitFor({ state: 'visible', timeout });

    // Click
    await locator.click({ timeout });

    console.log(`✓ Clicked: ${command.element}`);
  }

  /**
   * Execute FILL action
   */
  private async executeFill(locator: Locator, command: VibeCommand): Promise<void> {
    if (!command.parameters?.text) {
      throw new Error('FILL action requires "text" parameter');
    }

    const text = command.parameters.text;
    const timeout = command.parameters.timeout || 10000;

    // Wait for element
    await locator.waitFor({ state: 'visible', timeout });

    // Fill
    await locator.fill(text, { timeout });

    console.log(`✓ Filled "${text}" into: ${command.element}`);
  }

  /**
   * Execute SELECT action
   */
  private async executeSelect(locator: Locator, command: VibeCommand): Promise<void> {
    if (!command.parameters?.value) {
      throw new Error('SELECT action requires "value" parameter');
    }

    const value = command.parameters.value;
    const timeout = command.parameters.timeout || 10000;

    // Wait for element
    await locator.waitFor({ state: 'visible', timeout });

    // Select
    await locator.selectOption(value, { timeout });

    console.log(`✓ Selected "${value}" from: ${command.element}`);
  }

  /**
   * Execute VERIFY/CHECK action
   */
  private async executeVerify(locator: Locator, command: VibeCommand): Promise<boolean> {
    const timeout = command.parameters?.timeout || 10000;

    try {
      // Check if element is visible
      await locator.waitFor({ state: 'visible', timeout });

      // Additional verification based on parameters
      if (command.parameters?.expectedText) {
        const text = await locator.textContent();
        const matches = text?.includes(command.parameters.expectedText);
        console.log(`✓ Verified ${command.element} contains "${command.parameters.expectedText}": ${matches}`);
        return !!matches;
      }

      if (command.parameters?.expectedValue) {
        const value = await locator.inputValue();
        const matches = value === command.parameters.expectedValue;
        console.log(`✓ Verified ${command.element} value is "${command.parameters.expectedValue}": ${matches}`);
        return matches;
      }

      // Default: just verify element is visible
      console.log(`✓ Verified ${command.element} is visible`);
      return true;

    } catch (error) {
      console.log(`✗ Verification failed for ${command.element}`);
      return false;
    }
  }

  /**
   * Execute HOVER action
   */
  private async executeHover(locator: Locator, command: VibeCommand): Promise<void> {
    const timeout = command.parameters?.timeout || 10000;

    await locator.waitFor({ state: 'visible', timeout });
    await locator.hover({ timeout });

    console.log(`✓ Hovered over: ${command.element}`);
  }

  /**
   * Execute EXTRACT action
   */
  private async executeExtract(locator: Locator, command: VibeCommand): Promise<string | null> {
    const timeout = command.parameters?.timeout || 10000;

    await locator.waitFor({ state: 'visible', timeout });

    // Determine what to extract
    const extractType = command.parameters?.extractType || 'text';

    let value: string | null = null;

    switch (extractType) {
      case 'text':
        value = await locator.textContent();
        break;

      case 'value':
        value = await locator.inputValue();
        break;

      case 'attribute':
        if (!command.parameters?.attributeName) {
          throw new Error('EXTRACT with type "attribute" requires "attributeName" parameter');
        }
        value = await locator.getAttribute(command.parameters.attributeName);
        break;

      default:
        value = await locator.textContent();
    }

    console.log(`✓ Extracted from ${command.element}: "${value}"`);
    return value;
  }

  /**
   * Execute WAIT action
   */
  private async executeWait(locator: Locator, command: VibeCommand): Promise<void> {
    const timeout = command.parameters?.timeout || 10000;
    const state = command.parameters?.state || 'visible';

    await locator.waitFor({ state: state as any, timeout });

    console.log(`✓ Waited for ${command.element} to be ${state}`);
  }
}
