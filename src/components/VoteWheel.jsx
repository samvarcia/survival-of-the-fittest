'use client';

import { useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Mousewheel } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';
import SmoothImage, { preloadImages } from '@/components/SmoothImage';

const CARD_TONES = ['#E8D5A4', '#F3E6C4', '#DCC9A0', '#EFE0B5', '#E4D0A8'];

export default function VoteWheel({ outfits, onVote, votedFor }) {
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
        className="vote-stories"
        modules={[FreeMode, Mousewheel]}
        grabCursor
        loop
        centeredSlides
        slidesPerView="auto"
        spaceBetween={16}
        speed={720}
        cssEasing="cubic-bezier(0.22, 1, 0.36, 1)"
        freeMode={{
          enabled: true,
          sticky: true,
          momentumRatio: 0.55,
          momentumVelocityRatio: 0.7,
          momentumBounce: false,
          minimumVelocity: 0.08,
        }}
        mousewheel={{
          forceToAxis: true,
          sensitivity: 0.7,
          releaseOnEdges: true,
        }}
        resistanceRatio={0.55}
        threshold={4}
        longSwipesRatio={0.2}
        longSwipesMs={240}
        followFinger
        slideToClickedSlide
        watchSlidesProgress
        touchRatio={1.15}
        touchAngle={35}
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
                  alt={`Outfit by @${outfit.participantInstagram}`}
                  className="vote-story-image"
                  priority={index < 3}
                />
                <div className="vote-story-footer">
                  <span className="vote-story-handle">
                    @{outfit.participantInstagram}
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
