import { defineConfig } from 'vite-plus';

export function playgroundTasks(dev: string, build: string) {
  const task = (command: string) => ({
    command,
    dependsOn: ['unplugin-antd-table-better-scrollbar#build'],
    cache: false,
  });
  return defineConfig({ run: { tasks: { dev: task(`${dev} --open`), build: task(build) } } });
}
