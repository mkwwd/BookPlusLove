import assert from 'node:assert/strict';
import fs from 'node:fs';

const header = fs.readFileSync('src/components/Header.tsx', 'utf8');
const brand = fs.readFileSync('src/components/HeaderBrand.tsx', 'utf8');
assert.doesNotMatch(header, /flex-wrap/);
assert.match(header, /grid-cols-\[minmax\(0,1fr\)_auto\]/);
assert.match(brand, /min-w-0/);
console.log('Header keeps a dedicated menu column and shrinkable brand.');
