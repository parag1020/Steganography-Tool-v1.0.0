export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 1) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.5, ease: "easeOut" },
  }),
};

export const buttonMotion = {
  rest: { scale: 1 },
  hover: { scale: 1.05, boxShadow: "0 0 15px rgba(199,255,127,0.4)" },
  tap: { scale: 0.97 },
};

export const slideIn = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } },
};





