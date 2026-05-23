import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../globals.css';
import { Spike003EdgePan } from './Spike003EdgePan';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Spike003EdgePan />
  </StrictMode>
);
