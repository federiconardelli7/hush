// Dynamic config layered over app.json. The Firebase client config file is NOT
// committed (public repo): EAS builds receive it as a file-type secret exposed
// via the GOOGLE_SERVICES_JSON env var (a path EAS materializes); local builds
// read the untracked ./google-services.json.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
  },
});
