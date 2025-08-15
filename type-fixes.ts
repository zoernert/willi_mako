// Erstelle schnellen Fix für TypeScript Errors

// 1. bilateral-clarifications.ts fixes
const fixes = `
// Helper function for type casting
function parseQueryParam(param: any, defaultValue: number = 1): number {
  if (typeof param === 'string') {
    return parseInt(param) || defaultValue;
  }
  return typeof param === 'number' ? param : defaultValue;
}

function parseQueryParamString(param: any, defaultValue: string = ''): string {
  if (typeof param === 'string') {
    return param;
  }
  return Array.isArray(param) ? param[0] as string : defaultValue;
}
`;

export default fixes;
