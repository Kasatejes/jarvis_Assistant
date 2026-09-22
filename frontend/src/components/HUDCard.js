import React from 'react';
import './HUDCard.css';

const defaultCornerSize = 16;
const svgPadding = 2;
const svgCornerSize = 22;
const svgInnerCornerSize = svgCornerSize - svgPadding;

// Card Background Component utilizing clipPath
const Card = ({ tl, tr, bl, br, cornerSize = defaultCornerSize, customClassName, children }) => {
  const clipPath = `polygon(` 
    + `${tl ? `0 ${cornerSize}px, ${cornerSize}px 0,` : '0 0,'} ` 
    + `${tr ? `calc(100% - ${cornerSize}px) 0, 100% ${cornerSize}px,` : '100% 0,'} `
    + `${br ? `100% calc(100% - ${cornerSize}px), calc(100% - ${cornerSize}px) 100%,` : '100% 100%,'}  `
    + `${bl ? `${cornerSize}px 100%, 0 calc(100% - ${cornerSize}px)` : '0 100%'})`;

  return (
    <div className={customClassName} style={{ clipPath }}>
      {children}
    </div>
  );
};

// SVG Filters Sprite for outlines
export const SVGSprites = () => (
  <>
    <svg xmlns="http://www.w3.org/2000/svg" 
      aria-hidden="true"
      style={{ 
        position: "absolute", 
        width: "0", 
        height: "0", 
        overflow: "hidden" 
      }}
      viewBox="0 0 200 200" 
      preserveAspectRatio="none">
      <defs>
        <filter 
          id="glow--corner" 
          x="-125%" 
          y="-125%" 
          height="400%" 
          width="400%">
          <feGaussianBlur 
            in="SourceGraphic" 
            stdDeviation="4" />
        </filter>
      </defs>
    </svg>
    <svg xmlns="http://www.w3.org/2000/svg" 
      style={{ 
        position: "absolute", 
        width: "0", 
        height: "0", 
        overflow: "hidden" 
      }}
      viewBox="0 0 200 200" 
      preserveAspectRatio="none">
      <defs>
        <filter 
          id="glow--line" 
          filterUnits="userSpaceOnUse" 
          x="-100%" 
          y="-100%" 
          height="300%"
          width="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
        </filter>
      </defs>
    </svg>
  </>
);

const getAnimationStyles = ({ length, delay }) => ({
  animationDuration: `${length}ms`,
  animationDelay: `${delay}ms`,
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear'
});

const Corner = ({ rotation, animation, isClipped, cornerSize = defaultCornerSize }) => {
  const path = isClipped 
    ? `M22,2h-${svgInnerCornerSize - cornerSize}l-${cornerSize},${cornerSize}v${svgInnerCornerSize - cornerSize}` 
    : "M22,2H2,2V22";

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      height="100%" 
      width="100%" 
      viewBox="0 0 22 22"
      className="svg" 
      style={{ transform: `rotate(${rotation}deg)` }}>
      <path 
        className="svg__stroke svg__stroke--glow" 
        d={path} 
        style={animation ? getAnimationStyles(animation) : undefined} 
        filter="url(#glow--corner)" />
      <path 
        className="svg__stroke svg__stroke--bottom" 
        d={path} />
      <path 
        className="svg__stroke svg__stroke--top" 
        d={path} />
    </svg>
  );
};

const SideHorizontal = ({ rotation, animation, filterWidth = 60 }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg"
    height="100%" 
    width="100%" 
    viewBox={`0 0 ${filterWidth} 22`} 
    preserveAspectRatio="none"
    className="svg" 
    style={{ transform: `rotate(${rotation}deg)` }}>
    <line 
      className="svg__stroke svg__stroke--glow" 
      x1={filterWidth} 
      y1="2" 
      y2="2" 
      filter="url(#glow--line)"
      style={animation ? getAnimationStyles(animation) : undefined} />
    <line 
      className="svg__stroke svg__stroke--bottom" 
      x1={filterWidth} 
      y1="2" 
      y2="2" />
    <line 
      className="svg__stroke svg__stroke--top" 
      x1={filterWidth} 
      y1="2" 
      y2="2" />
  </svg>
);

const SideVertical = ({ rotation, animation, filterHeight = 16 }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    height="100%" 
    width="100%" 
    viewBox={`0 0 22 ${filterHeight}`} 
    preserveAspectRatio="none"
    className="svg" 
    style={{ transform: `rotate(${rotation}deg)` }}>
    <line 
      className="svg__stroke svg__stroke--glow" 
      x1="2" 
      x2="2" 
      y2={filterHeight} 
      filter="url(#glow--line)"
      style={animation ? getAnimationStyles(animation) : undefined} />
    <line 
      className="svg__stroke svg__stroke--bottom" 
      x1="2" 
      x2="2" 
      y2={filterHeight} />
    <line 
      className="svg__stroke svg__stroke--top" 
      x1="2" 
      x2="2" 
      y2={filterHeight} />
  </svg>
);

export const HUDCard = ({ 
  tl = true, 
  tr = true, 
  bl = true, 
  br = true, 
  children, 
  animation = { length: 3000, delay: 0 }, 
  cornerSize = defaultCornerSize, 
  filterHeight = 100, 
  filterWidth = 200 
}) => {
  const maxCornerSize = 20;
  const adjustedCornerSize = cornerSize <= maxCornerSize ? cornerSize : maxCornerSize;

  return (
    <div className="hud-card__container">
      {/* Clippath background */}
      <div 
        className="hud-card__background" 
        style={{ padding: `${svgPadding}px` }}>
        <Card 
          customClassName="card" 
          tl={tl} 
          tr={tr} 
          bl={bl} 
          br={br}
          cornerSize={cornerSize} />
      </div>

      {/* Outline put together using grid */}
      <div 
        className="hud-card__grid" 
        style={{
          gridTemplateColumns: `${svgCornerSize}px minmax(0px, 1fr) ${svgCornerSize}px`,
          gridTemplateRows: `${svgCornerSize}px minmax(0px, 1fr) ${svgCornerSize}px`
        }}>

        {/* Top Row */}
        <Corner 
          cornerSize={adjustedCornerSize} 
          rotation={0} 
          isClipped={tl} 
          animation={animation} />
        <SideHorizontal 
          rotation={0} 
          animation={animation} 
          filterWidth={filterWidth} />
        <Corner 
          cornerSize={adjustedCornerSize} 
          rotation={90} 
          isClipped={tr} 
          animation={animation} />

        {/* Center Row */}
        <SideVertical 
          rotation={0} 
          animation={animation} 
          filterHeight={filterHeight} />
        <div className="hud-card__content">
          {children}
        </div>
        <SideVertical 
          rotation={180} 
          animation={animation} 
          filterHeight={filterHeight} />

        {/* Bottom Row */}
        <Corner 
          cornerSize={adjustedCornerSize} 
          rotation={270} 
          isClipped={bl} 
          animation={animation} />
        <SideHorizontal 
          rotation={180} 
          animation={animation} 
          filterWidth={filterWidth} />
        <Corner 
          cornerSize={adjustedCornerSize} 
          rotation={180} 
          isClipped={br} 
          animation={animation} />
      </div>
    </div>
  );
};
