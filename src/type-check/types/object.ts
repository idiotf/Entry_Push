import type { TypeNode } from '../type-node'

export type ObjectShape<T> = {
  [K in keyof T]: TypeNode<T[K]>
}

export class ObjectNode<T extends object> implements TypeNode<T> {
  constructor(protected shape: ObjectShape<T>) {}

  parse(value: unknown) {
    if (!value || typeof value != 'object') throw TypeError()
    for (const k in this.shape) this.shape[k]?.parse(value[k as never])
    return value as T
  }
}

export function object<T extends object>(shape: ObjectShape<T>) {
  return new ObjectNode(shape)
}
