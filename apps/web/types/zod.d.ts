declare module 'zod' {
  export const z: any;
  export namespace z {
    export type infer<T> = any;
  }
}
