'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

const CARD_TONES = ['#E8D5A4', '#F3E6C4', '#DCC9A0', '#EFE0B5', '#E4D0A8'];

export default function VoteWheel({ outfits, onVote, votedFor }) {
  return (
    <div className="vote-stories-shell">
      <Swiper
        className="vote-stories"
        grabCursor
        loop
        centeredSlides
        slidesPerView="auto"
        spaceBetween={14}
        speed={420}
        resistanceRatio={0.65}
        slideToClickedSlide
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
                <img
                  src={outfit.image}
                  alt={`Outfit by @${outfit.participantInstagram}`}
                  className="vote-story-image"
                />
                <div className="vote-story-footer">
                  <span className="vote-story-handle">
                    @{outfit.participantInstagram}
                  </span>
                  <span className="vote-story-cta">vote</span>
                </div>
              </button>
            )}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
