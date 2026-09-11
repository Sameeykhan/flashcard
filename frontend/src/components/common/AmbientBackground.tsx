import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

export const AmbientBackground: React.FC = () => {
  const { theme, reducedMotion } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Color palettes by theme
    const themeParticleColors: Record<string, string[]> = {
      dark: ['rgba(99, 102, 241, 0.25)', 'rgba(168, 85, 247, 0.2)', 'rgba(56, 189, 248, 0.15)'],
      light: ['rgba(79, 70, 229, 0.12)', 'rgba(147, 51, 234, 0.1)', 'rgba(14, 165, 233, 0.1)'],
      neon: ['rgba(0, 245, 212, 0.35)', 'rgba(247, 37, 133, 0.3)', 'rgba(114, 9, 183, 0.25)'],
      nature: ['rgba(82, 183, 136, 0.25)', 'rgba(116, 198, 157, 0.2)', 'rgba(45, 106, 79, 0.2)'],
    };

    const colors = themeParticleColors[theme] || themeParticleColors.dark;

    interface Particle {
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      color: string;
      alpha: number;
    }

    const count = Math.min(45, Math.floor(width / 30));
    const particles: Particle[] = Array.from({ length: count }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.5 + 1,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: Math.random() * 0.5 + 0.3,
    }));

    if (reducedMotion) {
      // Static draw
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            ctx.beginPath();
            ctx.strokeStyle = colors[0].replace(/[\d.]+\)$/g, `${0.12 * (1 - dist / 130)})`);
            ctx.lineWidth = 0.75;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw & move particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [theme, reducedMotion]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Ambient gradient orbs for depth */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[var(--accent)] opacity-10 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[var(--accent)] opacity-10 blur-3xl" />
      <canvas ref={canvasRef} className="w-full h-full block opacity-70" />
    </div>
  );
};
