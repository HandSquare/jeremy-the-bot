declare module 'cowsay' {
  export function say(options: { text: string }): string;
}

declare module 'args-parser' {
  function argsParser(argv: string[]): Record<string, string>;
  export = argsParser;
}
