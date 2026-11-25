import React, { useEffect, useRef, useState } from 'react';

interface ScrollRevealCardProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
}

/**
 * Silky directional scroll-reveal wrapper for Feed cards, videos, photos, and stories.
 * Animates cards smoothly into view as you scroll down or back up the Muro,
 * with GPU-accelerated spring glide and zero layout shift.
 */
export const ScrollRevealCard: React.FC<ScrollRevealCardProps> = ({
  children,
  index = 0,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(index < 2);
  const [direction, setDirection] = useState<'up' | 'down'>('up');

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
          } else {
            // Only re-arm offscreen cards so scrolling back up or down animates smoothly again
            const rect = entry.boundingClientRect;
            if (rect.top > window.innerHeight + 60) {
              setDirection('up');
              setVisible(false);
            } else if (rect.bottom < -60) {
              setDirection('down');
              setVisible(false);
            }
          }
        }
      },
      {
        threshold: 0.06,
        rootMargin: '0px 0px -24px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const staggerMs = Math.min(index * 45, 180);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${staggerMs}ms` : '0ms' }}
      className={`feed-scroll-reveal ${
        visible
          ? 'feed-scroll-visible'
          : direction === 'up'
            ? 'feed-scroll-hidden-up'
            : 'feed-scroll-hidden-down'
      } ${className}`}
    >
      {children}
    </div>
  );
};
