import { render, h } from 'preact';
import { App } from './ui/app';

const root = document.getElementById('app')!;
if (new URLSearchParams(location.search).has('debugMap')) {
  void import('./render/debugMap').then(m => m.startDebugMap(root));
} else {
  render(h(App, {}), root);
  if (!import.meta.env.DEV) void import('./ui/pwa').then(m => m.setupPwa());
}
