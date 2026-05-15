import { SlackSelf } from './types';

let self: SlackSelf | undefined = undefined;

export function getSelf(): SlackSelf | undefined {
  return self;
}

export function setSelf(data: SlackSelf | undefined): void {
  self = data ? { ...data } : undefined;
}
