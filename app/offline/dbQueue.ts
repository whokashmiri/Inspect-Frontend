let queue: Promise<void> = Promise.resolve();

export function runDbTask<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);

  queue = next.then(
    () => undefined,
    () => undefined,
  );

  return next;
}