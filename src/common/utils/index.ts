export const getURL = (service: 'client' | 'server', path: string = '') => {
  return new URL(
    path,
    service === 'client' ? process.env.CLIENT_URL : process.env.SERVER_URL,
  ).toString();
};
