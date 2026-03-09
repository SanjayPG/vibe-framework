/**
 * Supported action types in Vibe
 */
export enum ActionType {
  CLICK = 'CLICK',
  FILL = 'FILL',
  SELECT = 'SELECT',
  VERIFY = 'VERIFY',
  WAIT = 'WAIT',
  HOVER = 'HOVER',
  EXTRACT = 'EXTRACT',
  CHECK = 'CHECK'
}

/**
 * Check if a string is a valid action type
 */
export function isValidActionType(action: string): action is ActionType {
  return Object.values(ActionType).includes(action as ActionType);
}
