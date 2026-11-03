/**
 * Entry point for the `dmn` command. `dmn prompt` takes a fast path that loads only the
 * snapshot reader, so shell prompts stay snappy; everything else loads the full CLI.
 */
const argv = process.argv.slice(2);

if (argv[0] === 'prompt' && argv.length === 1) {
  const [{ FileStore, defaultHome }, { promptLineFor }] = await Promise.all([
    import('@daemonling/store/node'),
    import('./fast-prompt.js'),
  ]);
  const snapshot = new FileStore({ home: defaultHome() }).readSnapshot();
  process.stdout.write(promptLineFor(snapshot?.state ?? null, new Date().toISOString()));
} else {
  const [{ processContext }, { runCli }] = await Promise.all([
    import('./context.js'),
    import('./program.js'),
  ]);
  process.exitCode = await runCli(argv, processContext());
}

export {};
