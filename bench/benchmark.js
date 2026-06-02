import { performance } from 'node:perf_hooks';
import Base from '../base.js';

class Email {
  constructor(value) {
    if (typeof value !== 'string' || !value.includes('@')) throw new Error('Invalid email');
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

function bench(name, fn) {
  for (let i = 0; i < warmup; i++) fn(i);
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn(i);
  const elapsedMs = performance.now() - start;
  const opsPerSec = (iterations / elapsedMs) * 1000;
  console.log(`${name.padEnd(30)} ${elapsedMs.toFixed(2)} ms  ${opsPerSec.toFixed(0)} ops/sec`);
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

bench('createFrom factory', (i) => {
  User.createFrom({
    id: i,
    name: '  Alice  ',
    email: new Email('alice@example.com'),
    tags: [' one ', ' two '],
    profile: { role: 'editor', active: true }
  });
});

bench('update validated fields', (i) => {
  const user = new User({
    id: i,
    name: 'Alice',
    email: new Email('alice@example.com')
  });
  user.update({ name: '  Bob  ', tags: [' x ', ' y '] });
});

bench('array mutations', (i) => {
  const user = new User({
    id: i,
    name: 'Alice',
    email: new Email('alice@example.com'),
    tags: ['init']
  });
  user.tags.push(' one ');
  user.tags.unshift(' zero ');
  user.tags.splice(1, 0, ' middle ');
  user.tags.concat([' extra ']);
});
