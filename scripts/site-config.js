const statuses = ["Draft", "Ready", "Published", "Hidden", "Archived", "Deleted"];
const galleryWidths = [320, 480, 640, 768, 900, 1024, 1600];
const galleryRoots = ["vrg-cards", "what-if", "misc-gens", "memetic-warfare"];

module.exports = {
  galleryRoots,
  galleryWidths,
  responsiveWidths: galleryWidths,
  statuses
};
