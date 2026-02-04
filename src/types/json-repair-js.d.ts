declare module 'json-repair-js' {
  interface RepairOptions {
    returnObjects?: boolean
    skipJsonParse?: boolean
    logging?: boolean
    ensureAscii?: boolean
  }

  /**
   * Simple function that parses broken JSON strings and returns a repaired JavaScript object
   */
  export function loads(brokenJson: string): unknown

  /**
   * Advanced function accepting configuration parameters
   */
  export function repairJson(brokenJson: string, options?: RepairOptions): unknown
}
