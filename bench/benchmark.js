import { performance } from 'node:perf_hooks';
import Base from '../base.js';

class Email {
  constructor(value) {
    if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Invalid email');
    this.value = value;
  }
}

class User extends Base {
  static schema = {
    id: { type: Number },
    name: { type: String, beforeChecks: (value) => typeof value === 'string' ? value.trim() : value },
    email: { type: Email },
    tags: { type: Array, default: [], values: { type: String, beforeChecks: (value) => typeof value === 'string' ? value.trim() : value } },
    profile: {
      type: Object,
      default: {},
      keys: {
        role: { type: String, default: 'viewer' },
        active: { type: Boolean, default: true }
      }
    }
  };
}

const iterations = Number(process.env.BENCH_ITERATIONS || 25000);
const warmup = Math.min(2000, Math.max(200, Math.floor(iterations / 10)));
const results = {
  'construct + validate': null,
  'Model.create() method': null,
  'bulk update validated fields': null,
}

function bench(name, fn) {
  for (let i = 0; i < warmup; i++) fn(i);
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn(i);
  const elapsedMs = performance.now() - start;
  const opsPerSec = (iterations / elapsedMs) * 1000;
  results[name] = { elapsedMs, opsPerSec };
}

console.log(`Iterations: ${iterations}`);
console.log('Running benchmarks...');

bench('construct + validate', (i) => {
  new User({
    id: i,
    name: '  Alice  ',
    email: new Email('alice@example.com'),
    tags: [' one ', ' two '],
    profile: { role: 'editor', active: true }
  });
});

bench('Model.create() method', (i) => {
  User.create({
    id: i,
    name: '  Alice  ',
    email: new Email('alice@example.com'),
    tags: [' one ', ' two '],
    profile: { role: 'editor', active: true }
  });
});

const user = new User({
  id: 0,
  name: 'Alice',
  email: new Email('alice@example.com')
});

bench('batch update validated fields', (i) => {
  user.update({ id: i, name: '  Bob  ', tags: [' x ', ' y '] });
});

const table = Object.entries(results).map(([name, { elapsedMs, opsPerSec }]) => ({
  Benchmark: name,
  'Time (ms)': Math.round(elapsedMs),
  'Ops/sec': Math.round(opsPerSec)
}));

console.table(table, ['Benchmark', 'Time (ms)', 'Ops/sec']);
