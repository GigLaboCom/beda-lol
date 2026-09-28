let count = 0;

/**
 * A fresh id prefix for a board that has no `id`, so several boards on one
 * page never share `<use>` or clip-path ids.
 */
export function nextBoardPrefix(): string {
  count += 1;
  return `tb${count}-`;
}
