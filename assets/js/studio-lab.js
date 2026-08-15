/**
 * studio-lab.js - Interactive behaviors for Studio Lab workbench
 */
(function() {
  // RND-??? shuffler for Summon Random Artifact button
  var btn = document.getElementById('random-artifact-btn');
  var idEl = document.getElementById('random-artifact-id');
  if (!btn || !idEl) return;

  var totalArtifacts = 80;
  var shuffleInterval = null;

  btn.addEventListener('mouseenter', function() {
    var count = 0;
    shuffleInterval = setInterval(function() {
      var n = Math.floor(Math.random() * totalArtifacts) + 1;
      idEl.textContent = 'RND-' + String(n).padStart(3, '0');
      count++;
      if (count >= 12) {
        clearInterval(shuffleInterval);
      }
    }, 60);
  });

  btn.addEventListener('mouseleave', function() {
    clearInterval(shuffleInterval);
    idEl.textContent = 'RND-???';
  });
})();
