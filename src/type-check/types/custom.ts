import type { TypeNode } from '../type-node'

export class CustomNode<T> implements TypeNode<T> {
  constructor(public parse: (value: unknown) => T) {}
}

export function custom<T>(handle: (value: unknown) => T) {
  return new CustomNode(handle)
}
