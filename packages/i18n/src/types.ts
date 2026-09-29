/**
 * Same keys as the English dictionary, with every leaf widened to `string`.
 * Typing a translation as `Shape<typeof en>` makes a missing or misspelt key a
 * compile error rather than a blank label in the field.
 */
export type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

/** Every dotted path to a string leaf: `common.actions.save`, … */
export type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

/** Values substituted into `{name}` placeholders. */
export type Params = Record<string, string | number>;
