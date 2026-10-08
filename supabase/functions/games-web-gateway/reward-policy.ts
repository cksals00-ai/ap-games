/** Sandbox grants local StoreKit benefits, never Production server rewards. */
export function passActiveForEnvironment(row: {pass_until?: string | null; pass_environment?: string | null} | null, expected: string, now = Date.now()): boolean {
  return (expected === 'Production' || expected === 'Sandbox') && row?.pass_environment === expected && !!row.pass_until && new Date(row.pass_until).getTime() > now;
}

