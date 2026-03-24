async function main() {
  console.log('MCP placeholder server bootstrapped. Tool registration arrives in Phase 7.');

  process.stdin.resume();
  await new Promise<void>((resolve) => {
    process.stdin.once('close', resolve);
  });
}

void main();
