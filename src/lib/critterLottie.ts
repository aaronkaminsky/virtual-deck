import type { AnimationItem } from 'lottie-web';

export type CritterVariant = 'idle' | 'sleepy' | 'gaze';

const VARIANT_ART: Record<CritterVariant, () => Promise<{ default: unknown }>> = {
  idle: () => import('../assets/critter.json'),
  sleepy: () => import('../assets/critter-sleepy.json'),
  gaze: () => import('../assets/critter-gaze.json'),
};

// Lazy-loads the Lottie runtime + critter art only when an attract fires,
// keeping both out of the main board bundle. Returns null on any failure —
// the attract easter egg must never surface an error state.
export async function loadCritter(container: HTMLElement, speed: number, variant: CritterVariant = 'idle'): Promise<AnimationItem | null> {
  try {
    const [{ default: lottie }, { default: animationData }] = await Promise.all([
      import('lottie-web/build/player/lottie_light'),
      VARIANT_ART[variant](),
    ]);
    const anim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData,
    });
    anim.setSpeed(speed);
    return anim;
  } catch {
    return null;
  }
}
