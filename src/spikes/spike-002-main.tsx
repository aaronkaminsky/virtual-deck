import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../globals.css';
import { Spike002OverlapHitTesting } from './Spike002OverlapHitTesting';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Spike002OverlapHitTesting />
  </StrictMode>
);
