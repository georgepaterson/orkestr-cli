const passthrough = (value: string): string => value;

const chalk = {
  red: passthrough,
  green: passthrough,
  yellow: passthrough,
  gray: passthrough,
};

export default chalk;
