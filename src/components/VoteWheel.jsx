'use client';

import { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Mousewheel } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';
import SmoothImage, { preloadImages } from '@/components/SmoothImage';
import ImageLightbox from '@/components/ImageLightbox';
import { getOutfitLabel } from '@/lib/outfit-label';

const CARD_TONES = ['#121212', '#161010', '#101010', '#1a0f0f', '#141212'];

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

export default function VoteWheel({ outfits, onVote, votedFor, votingClosed = false }) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [previewOutfit, setPreviewOutfit] = useState(null);

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

  const canLoop = outfits.length > 2;

  return (
    <div className={`vote-stories-shell${votingClosed ? ' is-closed' : ''}`}>
      <Swiper
        key={isDesktop ? 'desktop' : 'mobile'}
        className="vote-stories"
        modules={isDesktop ? [FreeMode, Mousewheel] : []}
        grabCursor
        loop={canLoop}
        centeredSlides
        slidesPerView={isDesktop ? 'auto' : 1.2}
        spaceBetween={isDesktop ? 16 : 12}
        speed={isDesktop ? 680 : 450}
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
        resistanceRatio={0.45}
        threshold={isDesktop ? 4 : 8}
        shortSwipes
        longSwipesRatio={0.3}
        longSwipesMs={260}
        followFinger
        slideToClickedSlide
        watchSlidesProgress
        touchRatio={1}
        touchAngle={35}
        onProgress={(swiper) => applyCardMotion(swiper, 0)}
        onSetTransition={(swiper, duration) => applyCardMotion(swiper, duration)}
        onInit={(swiper) => {
          applyCardMotion(swiper, 0);
        }}
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
              .filter(Boolean),
          );
        }}
      >
        {outfits.map((outfit, index) => (
          <SwiperSlide key={outfit.id}>
            {({ isActive }) => (
              <div
                className={`vote-story-card ${votedFor === outfit.id ? 'voted' : ''}${votingClosed ? ' is-closed' : ''}${isActive ? ' is-active' : ''}`}
                style={{ background: CARD_TONES[index % CARD_TONES.length] }}
              >
                <button
                  type="button"
                  className="vote-story-image-btn"
                  aria-label={`View ${getOutfitLabel(outfit)} full size`}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!isActive) return;
                    setPreviewOutfit(outfit);
                  }}
                >
                  <SmoothImage
                    src={outfit.image}
                    alt={`Outfit ${getOutfitLabel(outfit)}`}
                    className="vote-story-image"
                    priority={index < 3}
                  />
                </button>
                <button
                  type="button"
                  className="vote-story-footer"
                  disabled={votingClosed || !isActive}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (votingClosed || !isActive) return;
                    onVote(outfit);
                  }}
                >
                  <span className="vote-story-handle">
                    {getOutfitLabel(outfit)}
                  </span>
                  {!votingClosed && (
                    <span className="vote-story-cta">
                      {votedFor === outfit.id ? 'Voted' : 'Tap to vote'}
                    </span>
                  )}
                </button>
              </div>
            )}
          </SwiperSlide>
        ))}
      </Swiper>

      {previewOutfit && (
        <ImageLightbox
          outfit={previewOutfit}
          onClose={() => setPreviewOutfit(null)}
        />
      )}
    </div>
  );
}
