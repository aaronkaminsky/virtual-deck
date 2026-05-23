import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../globals.css';
import { Spike001FreeDrag } from './Spike001FreeDrag';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Spike001FreeDrag />
  </StrictMode>
);
