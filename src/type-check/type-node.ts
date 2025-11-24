export interface TypeNode<T> {
  parse(value: unknown): T
}
