import { playgroundTasks } from '../tasks.ts';

export default playgroundTasks(
  'vite ../react --config vite.demo.ts',
  'vite build ../react --config vite.demo.ts',
);
