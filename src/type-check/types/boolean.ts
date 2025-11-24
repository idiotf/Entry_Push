import type { TypeNode } from '../type-node'

export class BooleanNode implements TypeNode<boolean> {
  parse(value: unknown) {
    if (typeof value != 'boolean') throw TypeError()
    return value
  }
}

export function boolean() {
  return new BooleanNode
}
