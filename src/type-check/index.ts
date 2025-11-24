import type { TypeNode } from './type-node'

export * from './types'

export type infer<T extends TypeNode<unknown>> = ReturnType<T['parse']>
