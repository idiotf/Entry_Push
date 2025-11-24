import type { TypeNode } from '../type-node'

export class ArrayNode<T> implements TypeNode<T[]> {
  constructor(protected shape: TypeNode<T>) {}

  parse(value: unknown) {
    if (!Array.isArray(value)) throw TypeError()
    return value.map(v => this.shape.parse(v))
  }
}

export function array<T>(shape: TypeNode<T>) {
  return new ArrayNode(shape)
}
