// Writes src/mounts.css from src/mounts.ts.
import { writeFileSync } from 'node:fs';
import { mountsCss } from '../src/mounts';

writeFileSync(new URL('../src/mounts.css', import.meta.url), mountsCss());
