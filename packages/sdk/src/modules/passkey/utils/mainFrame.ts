import { WINDOW } from '../constants';

const frame_style = {
  position: 'fixed',
  zIndex: '99999999',
  borderRadius: '16px',
  boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
};

const backdrop_style = {
  position: 'fixed',
  top: '0',
  left: '0',
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0,0,0,0.5)',
  zIndex: '99999998',
};

export const getDimensions = () => {
  const breakponint = {
    md: {
      top: '0px',
      left: '0px',
      limit: 650,
      width: '100%',
      height: '100%',
    },
    lg: {
      top: `${(WINDOW.innerHeight - WINDOW.innerHeight * 0.7) / 2}px`,
      left: `${(WINDOW.innerWidth - WINDOW.innerWidth * 0.5) / 2}px`,
      limit: 1024,
      width: '50%',
      height: '70%',
    },
    xl: {
      top: `${(WINDOW.innerHeight - 650) / 2}px`,
      left: `${(WINDOW.innerWidth - 500) / 2}px`,
      limit: 1440,
      height: '650px',
      width: '500px',
    },
  };

  const b =
    WINDOW.innerWidth < breakponint.md.limit
      ? breakponint.md
      : WINDOW.innerWidth < breakponint.lg.limit
      ? breakponint.lg
      : breakponint.xl;

  return {
    ...b,
    ...frame_style,
  };
};

export const frameGen = (
  url: string,
  onBackdropClick: () => void,
): { frame: HTMLIFrameElement; backdrop: HTMLDivElement } => {
  const f = getDimensions();

  const frame_element = document.createElement('iframe');
  frame_element.src = url;

  // main frame
  frame_element.style.top = f.top;
  frame_element.style.left = f.left;
  frame_element.style.width = f.width;
  frame_element.style.height = f.height;
  frame_element.style.position = f.position;
  frame_element.style.zIndex = f.zIndex;
  frame_element.style.borderRadius = f.borderRadius;
  frame_element.style.boxShadow = f.boxShadow;

  // backdrop
  const backdrop = document.createElement('div');
  backdrop.style.position = backdrop_style.position;
  backdrop.style.top = backdrop_style.top;
  backdrop.style.left = backdrop_style.left;
  backdrop.style.width = backdrop_style.width;
  backdrop.style.height = backdrop_style.height;
  backdrop.style.backgroundColor = backdrop_style.backgroundColor;
  backdrop.style.zIndex = backdrop_style.zIndex;

  backdrop.addEventListener('click', onBackdropClick);

  return { frame: frame_element, backdrop };
};

// Usage:
// const { frame, backdrop } = createBackgroundFrame('https://example.com', () => {
//   console.log('Backdrop clicked, closing frame.');
//   document.body.removeChild(frame);
//   document.body.removeChild(backdrop);
// });
// document.body.appendChild(backdrop);
// document.body.appendChild(frame);
