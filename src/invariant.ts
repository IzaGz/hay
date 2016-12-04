export function invariant(condition: any, message: string) {
  !condition && ((x) => { throw x })(message);
}
