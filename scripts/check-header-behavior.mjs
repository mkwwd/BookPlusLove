import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import ts from 'typescript';

const { outputText } = ts.transpileModule(
  fs.readFileSync('src/components/HeaderBar.tsx', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
);

for (const home of [true, false]) {
  for (const scrolled of [true, false]) {
    test(`header styles and scroll behavior: home=${home}, scrolled=${scrolled}`, () => {
      const exports = {};
      let effect;
      let listener;
      let removed;
      let state;
      const window = {
        scrollY: 20,
        addEventListener(event, callback, options) {
          assert.equal(event, 'scroll');
          assert.equal(options.passive, true);
          listener = callback;
        },
        removeEventListener(event, callback) {
          assert.equal(event, 'scroll');
          removed = callback;
        },
      };
      const dependencies = {
        react: {
          useState: () => [scrolled, (value) => { state = value; }],
          useEffect: (callback) => { effect = callback; },
        },
        'next/navigation': { usePathname: () => home ? '/' : '/notices' },
        'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
      };
      vm.runInNewContext(outputText, { exports, window, require: (name) => dependencies[name] });
      const { type, props } = exports.default({ children: 'brand and menu' });
      assert.equal(type, 'header');
      assert.equal(props.children, 'brand and menu');
      assert.equal(props['data-home'], home);
      assert.equal(props['data-scrolled'], scrolled);
      const expected = [home ? 'fixed inset-x-0' : 'sticky', 'top-0 z-50 transition-all duration-300'];
      if (home || scrolled) expected.push('bg-[#fffdfa] shadow-md');
      else expected.push('header-bg');
      if (home && !scrolled) expected.push('sm:bg-transparent sm:shadow-none sm:backdrop-blur-xs');
      assert.equal(props.className.split(/\s+/).sort().join(' '), expected.join(' ').split(/\s+/).sort().join(' '));
      const cleanup = effect();
      assert.equal(state, false);
      window.scrollY = 21;
      listener();
      assert.equal(state, true);
      window.scrollY = 0;
      listener();
      assert.equal(state, false);
      cleanup();
      assert.equal(removed, listener);
    });
  }
}
