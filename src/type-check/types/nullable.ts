import type { TypeNode } from '../type-node'

export class NullableNode<T> implements TypeNode<T | null> {
  constructor(protected shape: TypeNode<T>) {}

  parse(value: unknown) {
    if (value === null) return value
    return this.shape.parse(value)
  }
}

export function nullable<T>(shape: TypeNode<T>) {
  return new NullableNode(shape)
}
