// An adult can compare all sounds without changing the child's learning route.
// Exactly one clip plays at a time; never start or repeat speech automatically.
document.addEventListener('play', event => {
  if (!(event.target instanceof HTMLMediaElement)) return;
  for (const media of document.querySelectorAll('audio')) {
    if (media !== event.target) media.pause();
  }
}, true);
