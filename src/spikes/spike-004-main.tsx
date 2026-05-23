import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../globals.css';
import { Spike004MultiCardDrop } from './Spike004MultiCardDrop';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Spike004MultiCardDrop />
  </StrictMode>
);
