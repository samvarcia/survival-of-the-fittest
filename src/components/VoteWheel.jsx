'use client';

import { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Mousewheel } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';
import SmoothImage, { preloadImages } from '@/components/SmoothImage';
import { getOutfitLabel } from '@/lib/outfit-label';

const CARD_TONES = ['#E8D5A4', '#F3E6C4', '#DCC9A0', '#EFE0B5', '#E4D0A8'];

function applyCardMotion(swiper, durationMs) {
  const duration = `${Math.max(0, durationMs)}ms`;

  swiper.slides.forEach((slide) => {
    const card = slide.querySelector('.vote-story-card');
    if (!card) return;

    const progress = Number.isFinite(slide.progress) ? slide.progress : 0;
    const abs = Math.min(Math.abs(progress), 1.35);
    const scale = 1 - Math.min(abs * 0.065, 0.09);
    const opacity = 1 - Math.min(abs * 0.28, 0.34);

    card.style.transitionDuration = duration;
    card.style.transitionTimingFunction = 'cubic-bezier(0.22, 1, 0.36, 1)';
    card.style.transform = `scale(${scale})`;
    card.style.opacity = String(opacity);
  });
}

export default function VoteWheel({ outfits, onVote, votedFor }) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)');
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const urls = outfits.map((outfit) => outfit.image);
    preloadImages(urls.slice(0, 4));

    const rest = urls.slice(4);
    const run = () => preloadImages(rest);
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 250));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = idle(run);
    return () => cancel(id);
  }, [outfits]);

  return (
    <div className="vote-stories-shell">
      <Swiper
        key={isDesktop ? 'desktop' : 'mobile'}
        className="vote-stories"
        modules={isDesktop ? [FreeMode, Mousewheel] : []}
        grabCursor
        loop
        centeredSlides
        slidesPerView="auto"
        spaceBetween={isDesktop ? 16 : 12}
        speed={isDesktop ? 680 : 420}
        cssEasing="cubic-bezier(0.22, 1, 0.36, 1)"
        freeMode={
          isDesktop
            ? {
                enabled: true,
                sticky: true,
                momentumRatio: 0.5,
                momentumVelocityRatio: 0.65,
                momentumBounce: false,
                minimumVelocity: 0.08,
              }
            : false
        }
        mousewheel={
          isDesktop
            ? {
                forceToAxis: true,
                sensitivity: 0.7,
                releaseOnEdges: true,
              }
            : false
        }
        resistanceRatio={isDesktop ? 0.55 : 0.35}
        threshold={isDesktop ? 4 : 2}
        shortSwipes
        longSwipesRatio={0.18}
        longSwipesMs={220}
        followFinger
        slideToClickedSlide
        watchSlidesProgress
        touchRatio={isDesktop ? 1.1 : 1.35}
        touchAngle={40}
        touchMoveStopPropagation
        onProgress={(swiper) => applyCardMotion(swiper, 0)}
        onSetTransition={(swiper, duration) => applyCardMotion(swiper, duration)}
        onInit={(swiper) => applyCardMotion(swiper, 0)}
        onSlideChange={(swiper) => {
          const indexes = [
            swiper.realIndex,
            swiper.realIndex + 1,
            swiper.realIndex + 2,
            swiper.realIndex - 1,
          ];
          preloadImages(
            indexes
              .map((i) => outfits[((i % outfits.length) + outfits.length) % outfits.length]?.image)
              .filter(Boolean)
          );
        }}
      >
        {outfits.map((outfit, index) => (
          <SwiperSlide key={outfit.id}>
            {({ isActive }) => (
              <button
                type="button"
                className={`vote-story-card ${votedFor === outfit.id ? 'voted' : ''}`}
                style={{ background: CARD_TONES[index % CARD_TONES.length] }}
                onClick={() => {
                  if (isActive) onVote(outfit);
                }}
              >
                <SmoothImage
                  src={outfit.image}
                  alt={`Outfit ${getOutfitLabel(outfit)}`}
                  className="vote-story-image"
                  priority={index < 3}
                />
                <div className="vote-story-footer">
                  <span className="vote-story-handle">
                    {getOutfitLabel(outfit)}
                  </span>
                </div>
              </button>
            )}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
