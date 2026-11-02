// read the whole book:  node src/readbook.js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeBook } from './book.js';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'book');
console.log(makeBook(dir).whole());
