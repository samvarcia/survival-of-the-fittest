'use client';

import { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Mousewheel } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';
import SmoothImage, { preloadImages } from '@/components/SmoothImage';
import { getOutfitLabel } from '@/lib/outfit-label';

const CARD_TONES = ['#121212', '#161010', '#101010', '#1a0f0f', '#141212'];

function applyCardMotion(swiper) {
  const slides = swiper.slides;
  for (let i = 0; i < slides.length; i += 1) {
    const slide = slides[i];
    const card = slide.querySelector('.vote-story-card');
    if (!card) continue;

    const progress = Number.isFinite(slide.progress) ? slide.progress : 0;
    // Skip far-off slides — keeps touch frames cheap with many outfits
    if (Math.abs(progress) > 2.2) {
      card.style.opacity = '0.55';
      card.style.transform = 'scale(0.9)';
      continue;
    }

    const abs = Math.min(Math.abs(progress), 1.25);
    const scale = 1 - Math.min(abs * 0.07, 0.1);
    const opacity = 1 - Math.min(abs * 0.3, 0.38);
    card.style.transform = `scale(${scale})`;
    card.style.opacity = String(opacity);
  }
}

export default function VoteWheel({ outfits, onVote, votedFor, votingClosed = false }) {
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
    preloadImages(urls.slice(0, 6));

    const rest = urls.slice(6);
    const run = () => preloadImages(rest);
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 250));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = idle(run);
    return () => cancel(id);
  }, [outfits]);

  const canLoop = outfits.length > 3;

  const openVote = (outfit, event) => {
    event.stopPropagation();
    if (votingClosed) return;
    const slide = event.currentTarget.closest('.swiper-slide');
    if (slide && !slide.classList.contains('swiper-slide-active')) return;
    onVote(outfit);
  };

  return (
    <div className={`vote-stories-shell${votingClosed ? ' is-closed' : ''}`}>
      <Swiper
        key={isDesktop ? 'desktop' : 'mobile'}
        className="vote-stories"
        modules={isDesktop ? [FreeMode, Mousewheel] : []}
        grabCursor
        loop={canLoop}
        loopAdditionalSlides={4}
        centeredSlides
        slidesPerView="auto"
        spaceBetween={isDesktop ? 16 : 14}
        speed={isDesktop ? 620 : 380}
        cssEasing="cubic-bezier(0.25, 0.8, 0.25, 1)"
        freeMode={
          isDesktop
            ? {
                enabled: true,
                sticky: true,
                momentumRatio: 0.45,
                momentumVelocityRatio: 0.6,
                momentumBounce: false,
                minimumVelocity: 0.06,
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
        resistanceRatio={0.65}
        threshold={isDesktop ? 4 : 5}
        shortSwipes
        longSwipesRatio={0.2}
        longSwipesMs={240}
        followFinger
        slideToClickedSlide
        watchSlidesProgress
        touchRatio={1}
        touchAngle={40}
        simulateTouch
        passiveListeners
        preventClicks
        preventClicksPropagation
        onSwiper={(swiper) => {
          applyCardMotion(swiper);
        }}
        onProgress={(swiper) => applyCardMotion(swiper)}
        onSetTransition={(swiper, duration) => {
          swiper.slides.forEach((slide) => {
            const card = slide.querySelector('.vote-story-card');
            if (!card) return;
            card.style.transitionDuration = `${Math.max(0, duration)}ms`;
            card.style.transitionTimingFunction = 'cubic-bezier(0.25, 0.8, 0.25, 1)';
          });
          applyCardMotion(swiper);
        }}
        onTouchStart={(swiper) => {
          swiper.slides.forEach((slide) => {
            const card = slide.querySelector('.vote-story-card');
            if (card) card.style.transitionDuration = '0ms';
          });
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
            <div
              className={`vote-story-card ${votedFor === outfit.id ? 'voted' : ''}${votingClosed ? ' is-closed' : ''}`}
              style={{ background: CARD_TONES[index % CARD_TONES.length] }}
            >
              <button
                type="button"
                className="vote-story-image-btn"
                aria-label={`Vote for ${getOutfitLabel(outfit)}`}
                disabled={votingClosed}
                onClick={(event) => openVote(outfit, event)}
              >
                <SmoothImage
                  src={outfit.image}
                  alt={`Outfit ${getOutfitLabel(outfit)}`}
                  className="vote-story-image"
                  priority={index < 4}
                />
              </button>
              <button
                type="button"
                className="vote-story-footer"
                disabled={votingClosed}
                onClick={(event) => openVote(outfit, event)}
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
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
