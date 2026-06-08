declare module '@kbn/config-schema' {
  export interface Type<T> {
    _type: T;
  }

  export interface Schema {
    string(options?: { defaultValue?: string; minLength?: number; maxLength?: number }): Type<string>;
    number(options?: { defaultValue?: number; min?: number; max?: number }): Type<number>;
    boolean(options?: { defaultValue?: boolean }): Type<boolean>;
    object<T extends Record<string, Type<unknown>>>(props: T): Type<{ [K in keyof T]: T[K] extends Type<infer V> ? V : never }>;
    maybe<T>(type: Type<T>): Type<T | undefined>;
    nullable<T>(type: Type<T>): Type<T | null>;
    arrayOf<T>(type: Type<T>): Type<T[]>;
    oneOf<T>(types: Array<Type<T>>): Type<T>;
    any(): Type<unknown>;
    literal<T extends string | number | boolean>(value: T): Type<T>;
  }

  export const schema: Schema;
}