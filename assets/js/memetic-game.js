(function () {
  const data = window.memeticGameData;
  const app = document.querySelector("[data-memetic-app]");

  if (!data || !app) {
    return;
  }

  const artifactById = new Map((window.galleryItems || []).map((item) => [item.id, item]));
  const enemyById = new Map(data.enemyTypes.map((enemy) => [enemy.id, enemy]));
  let selectedWeaponIds = [];
  let runState = null;
  let runInterval = null;
  let nextWaveTimer = null;
  let goblinDetectionTimer = null;
  let eventCounter = 0;
  let goblinOverlayShown = false;
  let lastCopiedText = "";

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getArtifactForWeapon(weapon) {
    return artifactById.get(weapon.artifactId) || null;
  }

  function getArtifactImage(artifact) {
    if (!artifact) {
      return "";
    }

    const variants = Array.isArray(artifact.variants) ? artifact.variants : [];
    const preferred = variants.find((variant) => Number(variant.width) === 768)
      || variants.find((variant) => Number(variant.width) === 900)
      || variants[0];

    return artifact.thumbnail || (preferred && preferred.url) || artifact.image || "";
  }

  function getWeapon(id) {
    return data.weapons.find((weapon) => weapon.id === id) || null;
  }

  function displayWeapon(weapon) {
    const artifact = getArtifactForWeapon(weapon);

    return {
      ...weapon,
      displayTitle: weapon.title,
      artifactTitle: artifact ? artifact.title : weapon.title,
      image: getArtifactImage(artifact),
      description: artifact && artifact.description ? artifact.description : weapon.pickerCopy,
      alt: artifact && artifact.alt ? artifact.alt : `${weapon.title} ancient tech weapon`
    };
  }

  function selectedWeapons() {
    return selectedWeaponIds.map(getWeapon).filter(Boolean);
  }

  function selectedCost() {
    return selectedWeapons().reduce((sum, weapon) => sum + weapon.cost, 0);
  }

  function isSelectionValid() {
    return selectedWeaponIds.length === data.requiredWeapons && selectedCost() <= data.budgetLimit;
  }

  function canSelect(weapon) {
    if (selectedWeaponIds.includes(weapon.id)) {
      return true;
    }

    if (selectedWeaponIds.length >= data.requiredWeapons) {
      return false;
    }

    return selectedCost() + weapon.cost <= data.budgetLimit;
  }

  function statTotal(weapons, key) {
    return weapons.reduce((sum, weapon) => sum + Number(weapon.stats[key] || 0), 0);
  }

  function seededRandom(run) {
    run.rngState = (run.rngState * 1664525 + 1013904223) >>> 0;
    return run.rngState / 4294967296;
  }

  function randomInt(run, min, max) {
    return Math.floor(seededRandom(run) * (max - min + 1)) + min;
  }

  function chance(run, probability) {
    return seededRandom(run) < probability;
  }

  function readScores() {
    try {
      const raw = window.localStorage.getItem(data.storageKey);
      return raw ? JSON.parse(raw) : { bestClean: null, bestGoblin: null, recentRuns: [] };
    } catch (error) {
      return { bestClean: null, bestGoblin: null, recentRuns: [] };
    }
  }

  function writeScores(scores) {
    try {
      window.localStorage.setItem(data.storageKey, JSON.stringify(scores));
    } catch (error) {
      return false;
    }

    return true;
  }

  function saveResult(result) {
    const scores = readScores();
    const summary = {
      score: result.finalScore,
      wavesSurvived: result.wavesSurvived,
      runCode: result.runCode,
      loadoutIds: result.loadoutIds,
      createdAt: new Date().toISOString()
    };

    if (result.integrity.status === "goblin") {
      if (!scores.bestGoblin || result.finalScore > scores.bestGoblin.score) {
        scores.bestGoblin = summary;
      }
    } else if (!scores.bestClean || result.finalScore > scores.bestClean.score) {
      scores.bestClean = summary;
    }

    scores.recentRuns = [summary, ...(scores.recentRuns || [])].slice(0, 10);
    writeScores(scores);
    return scores;
  }

  function makePips(value) {
    const amount = clamp(Number(value || 0), 0, 5);
    let html = "";

    for (let index = 0; index < 5; index += 1) {
      html += `<span class="stat-pip${index < amount ? " is-filled" : ""}"></span>`;
    }

    return html;
  }

  function renderStats(stats) {
    const visibleStats = [
      ["DMG", "damage"],
      ["DEF", "defense"],
      ["SPD", "speed"],
      ["CHAOS", "chaos"]
    ];

    return visibleStats.map(([label, key]) => `
      <div class="weapon-stat">
        <span>${escapeHtml(label)}</span>
        <span class="stat-pips" aria-label="${escapeHtml(key)} ${Number(stats[key] || 0)} out of 5">${makePips(stats[key])}</span>
      </div>
    `).join("");
  }

  function renderWeaponMedia(weapon) {
    const item = displayWeapon(weapon);

    if (item.image) {
      return `<img class="weapon-card__image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.alt)}" loading="lazy" decoding="async">`;
    }

    return `<div class="weapon-card__fallback" aria-hidden="true">${escapeHtml(weapon.fallbackLabel)}</div>`;
  }

  function renderSelection() {
    const cost = selectedCost();
    const remaining = data.budgetLimit - cost;
    const valid = isSelectionValid();
    const groupedCosts = Array.from(new Set(data.weapons.map((weapon) => weapon.cost))).sort((a, b) => b - a);
    const selected = selectedWeapons();
    const tagSummary = Array.from(new Set(selected.flatMap((weapon) => weapon.tags))).slice(0, 5);
    const statusMessage = valid
      ? "Ready for the dungeon."
      : selectedWeaponIds.length === data.requiredWeapons
        ? "Budget check required."
        : `Choose ${data.requiredWeapons - selectedWeaponIds.length} more relic${data.requiredWeapons - selectedWeaponIds.length === 1 ? "" : "s"}.`;

    app.className = "memetic-app";
    document.documentElement.classList.toggle("is-goblin-mode", Boolean(runState && runState.integrity.status === "goblin"));
    app.innerHTML = `
      <header class="memetic-hero">
        <div>
          <p class="memetic-kicker">Lemonteed / Memetic Warfare</p>
          <h1>Build Your Ancient Tech Loadout</h1>
          <p class="memetic-intro">Pick 4 cursed relics. Stay within the $12 budget. Then enter the dungeon.</p>
        </div>
        <div class="status-chips" aria-label="Loadout status">
          <div class="status-chip"><span>Budget Used</span><strong>$${cost} / $${data.budgetLimit}</strong></div>
          <div class="status-chip"><span>Remaining</span><strong class="${remaining < 0 ? "is-danger" : ""}">$${remaining}</strong></div>
          <div class="status-chip"><span>Selected</span><strong>${selectedWeaponIds.length} / ${data.requiredWeapons}</strong></div>
          <div class="status-chip"><span>Run Status</span><strong class="status-clean">Clean Run</strong></div>
        </div>
      </header>

      <div class="selection-layout">
        <aside class="selected-loadout command-console" aria-label="Selected loadout command console">
          <div class="selected-loadout__head">
            <div>
              <p class="memetic-kicker">Command Console</p>
              <h2>Selected Loadout</h2>
            </div>
            <button class="memetic-button" type="button" data-clear-loadout ${selectedWeaponIds.length ? "" : "disabled"}>Clear</button>
          </div>
          <div class="loadout-slots">
            ${Array.from({ length: data.requiredWeapons }).map((_, index) => renderLoadoutSlot(selected[index], index)).join("")}
          </div>
          <div class="console-meter">
            ${renderConsoleStat("Budget Used", `$${cost} / $${data.budgetLimit}`)}
            ${renderConsoleStat("Remaining", `$${remaining}`, remaining < 0)}
            ${renderConsoleStat("Selected", `${selectedWeaponIds.length} / ${data.requiredWeapons}`)}
          </div>
          <div class="confirmation-panel${valid ? " is-ready" : ""}">
            <div>
              <span>Current Status</span>
              <strong>${escapeHtml(statusMessage)}</strong>
            </div>
            <div>
              <span>Build Tags</span>
              <strong>${tagSummary.length ? tagSummary.join(" / ").toUpperCase() : "NO RELICS SELECTED"}</strong>
            </div>
          </div>
          <button class="memetic-button memetic-button--primary start-run-button" type="button" data-start-run ${valid ? "" : "disabled"}>Start Run</button>
        </aside>

        <section class="weapon-grid" aria-label="Weapon pricing grid">
          ${groupedCosts.map((price) => `
            <div class="price-row">
              <div class="price-row__head">
                <h2>$${price} Relics</h2>
                <span>${data.weapons.filter((weapon) => weapon.cost === price).length} available</span>
              </div>
              <div class="price-row__grid">
                ${data.weapons.filter((weapon) => weapon.cost === price).map((weapon) => renderWeaponCard(weapon)).join("")}
              </div>
            </div>
          `).join("")}
        </section>
      </div>
    `;
  }

  function renderConsoleStat(label, value, danger) {
    return `
      <div>
        <span>${escapeHtml(label)}</span>
        <strong class="${danger ? "is-danger" : ""}">${escapeHtml(value)}</strong>
      </div>
    `;
  }

  function renderWeaponCard(weapon) {
    const selected = selectedWeaponIds.includes(weapon.id);
    const unavailableReason = selected ? "" : selectionBlockReason(weapon);
    const disabled = Boolean(unavailableReason);
    const item = displayWeapon(weapon);

    return `
      <button class="weapon-card${selected ? " is-selected" : ""}${disabled ? " is-disabled" : ""}" type="button" data-select-weapon="${escapeHtml(weapon.id)}" ${disabled && !selected ? "disabled" : ""} aria-pressed="${selected ? "true" : "false"}">
        <span class="weapon-card__price">$${weapon.cost}</span>
        ${selected ? `<span class="weapon-card__badge">Selected</span>` : ""}
        ${unavailableReason ? `<span class="weapon-card__badge weapon-card__badge--blocked">${escapeHtml(unavailableReason)}</span>` : ""}
        <span class="weapon-card__media">${renderWeaponMedia(weapon)}</span>
        <span class="weapon-card__body">
          <span class="weapon-card__title">${escapeHtml(item.displayTitle)}</span>
          <span class="weapon-card__copy">${escapeHtml(weapon.pickerCopy)}</span>
          <span class="weapon-card__tags">${weapon.tags.map((tag) => escapeHtml(tag)).join(" / ")}</span>
          <span class="weapon-stats">${renderStats(weapon.stats)}</span>
          <span class="weapon-card__action">${selected ? "Remove" : "Select"}</span>
        </span>
      </button>
    `;
  }

  function selectionBlockReason(weapon) {
    if (selectedWeaponIds.includes(weapon.id)) {
      return "";
    }

    if (selectedWeaponIds.length >= data.requiredWeapons) {
      return "Loadout Full";
    }

    if (selectedCost() + weapon.cost > data.budgetLimit) {
      return "Over Budget";
    }

    return "";
  }

  function renderLoadoutSlot(weapon, index) {
    if (!weapon) {
      return `<div class="loadout-slot is-empty"><span>Slot ${index + 1}</span><strong>Awaiting Relic</strong></div>`;
    }

    const item = displayWeapon(weapon);
    return `
      <button class="loadout-slot" type="button" data-remove-weapon="${escapeHtml(weapon.id)}">
        <span class="loadout-slot__index">Slot ${index + 1}</span>
        <strong>${escapeHtml(weapon.title)}</strong>
        <span>$${weapon.cost} / Remove</span>
      </button>
    `;
  }

  function computePlayer(weapons) {
    const defense = statTotal(weapons, "defense");
    const speed = statTotal(weapons, "speed");
    const chaos = statTotal(weapons, "chaos");
    const damage = statTotal(weapons, "damage");
    const reliability = statTotal(weapons, "reliability");
    const hasShield = weapons.some((weapon) => weapon.behavior.type === "guard");
    const maxHealth = 100 + defense * 4;

    return {
      maxHealth,
      health: maxHealth,
      blockChance: clamp(0.05 + defense * 0.012 + (hasShield ? 0.08 : 0), 0.05, 0.45),
      damageMultiplier: 1 + damage * 0.012,
      defense,
      speedModifier: Math.floor(speed / 5),
      chaos,
      reliability,
      activeBuffs: [],
      activeDebuffs: []
    };
  }

  function createRun() {
    const weapons = selectedWeapons();
    const seed = Math.floor(1000 + Math.random() * 9000);
    const runtime = {};

    weapons.forEach((weapon) => {
      runtime[weapon.id] = { cooldown: 1, combo: 0, guard: 0, lastProc: "", lastActiveTick: -99 };
    });

    return {
      phase: "running",
      selectedWeaponIds: weapons.map((weapon) => weapon.id),
      selectedCost: selectedCost(),
      selectedWeapons: weapons,
      budgetLimit: data.budgetLimit,
      seed,
      rngState: seed,
      integrity: { status: "clean", reason: "", detectedAt: null },
      waveNumber: 0,
      wavesSurvived: 0,
      enemiesDefeated: 0,
      bossesDefeated: 0,
      currentEnemies: [],
      isWaveTransitioning: false,
      player: computePlayer(weapons),
      weaponRuntime: runtime,
      battleLog: [],
      tick: 0,
      currentScore: 0,
      result: null,
      startedAt: Date.now(),
      endedAt: 0
    };
  }

  function appendLog(message, tone, type, meta) {
    if (!runState) {
      return;
    }

    eventCounter += 1;
    runState.battleLog.unshift({
      id: `evt-${eventCounter}`,
      tick: runState.tick,
      type: type || "system",
      tone: tone || "normal",
      message,
      meta: meta || {}
    });

    runState.battleLog = runState.battleLog.slice(0, data.maxLogEntries);
  }

  function generateWave(number) {
    const enemies = [];
    const basicPool = ["pop-up-goblin", "spam-bat"];
    const midPool = ["trojan-knight", "dial-up-wraith", "captcha-troll"];
    const count = 2 + number;
    const scaleHealth = 1 + number * 0.12;
    const scaleAttack = 1 + number * 0.08;
    let bossTypeId = null;

    if (number % 5 === 0) {
      if (number >= 20) {
        bossTypeId = "internet-explorer-lich";
      } else if (number >= 15) {
        bossTypeId = "404-dragon";
      } else if (number >= 10) {
        bossTypeId = "blue-screen-behemoth";
      } else {
        bossTypeId = "buffering-hydra";
      }
    }

    for (let index = 0; index < count; index += 1) {
      const pool = number >= 3 && index % 3 === 0 ? midPool : basicPool;
      const typeId = pool[randomInt(runState, 0, pool.length - 1)];
      enemies.push(createEnemyInstance(typeId, number, scaleHealth, scaleAttack, enemies.length));
    }

    if (bossTypeId) {
      enemies.push(createEnemyInstance(bossTypeId, number, scaleHealth, scaleAttack, enemies.length));
    }

    return { number, enemies, bossTypeId, modifiers: number % 5 === 0 ? ["boss"] : [] };
  }

  function createEnemyInstance(typeId, waveNumber, scaleHealth, scaleAttack, index) {
    const type = enemyById.get(typeId);
    return {
      id: `${typeId}-${waveNumber}-${index}`,
      typeId,
      name: type.name,
      tier: type.tier,
      maxHealth: Math.round(type.maxHealth * scaleHealth),
      health: Math.round(type.maxHealth * scaleHealth),
      attack: Math.round(type.attack * scaleAttack),
      speed: type.speed,
      armor: type.armor,
      scoreValue: type.scoreValue,
      traits: type.traits,
      debuffs: {},
      marks: 0,
      lastDamage: 0,
      lastHitTick: -99,
      attackCooldown: Math.max(1, 4 - type.speed)
    };
  }

  function startWave(number) {
    if (!runState || runState.phase !== "running") {
      return;
    }

    const wave = generateWave(number);
    runState.waveNumber = number;
    runState.currentEnemies = wave.enemies;
    runState.isWaveTransitioning = false;
    appendLog(`Wave ${number} breaches the relic chamber.`, "normal", "wave-start");

    wave.enemies.slice(0, 3).forEach((enemy) => {
      const type = enemyById.get(enemy.typeId);
      appendLog(type.logIntro, enemy.tier === "boss" ? "bad" : "normal", "enemy-intro", { enemyId: enemy.id });
    });

    updateCurrentScore();
    renderRun();
  }

  function livingEnemies() {
    return runState.currentEnemies.filter((enemy) => enemy.health > 0);
  }

  function selectTargets(weapon) {
    const enemies = livingEnemies();

    if (!enemies.length) {
      return [];
    }

    if (weapon.behavior.target === "weakest") {
      return [enemies.slice().sort((a, b) => a.health - b.health)[0]];
    }

    if (weapon.behavior.target === "random") {
      return [enemies[randomInt(runState, 0, enemies.length - 1)]];
    }

    if (weapon.behavior.target === "multi") {
      return enemies.slice(0, Math.min(weapon.behavior.hits || 2, enemies.length));
    }

    return [enemies[0]];
  }

  function effectiveMissChance(weapon) {
    const reliability = runState.player.reliability;
    return clamp((weapon.behavior.missChance || 0) - reliability * 0.006, 0, 0.35);
  }

  function applyDamage(enemy, amount, weapon, flags) {
    const markedMultiplier = enemy.marks ? 1.15 + enemy.marks * 0.05 : 1;
    const rawDamage = amount * runState.player.damageMultiplier * markedMultiplier;
    const finalDamage = Math.max(1, Math.round(rawDamage) - enemy.armor);

    enemy.health = Math.max(0, enemy.health - finalDamage);
    enemy.lastDamage = finalDamage;
    enemy.lastHitTick = runState.tick;

    if (enemy.health <= 0) {
      runState.enemiesDefeated += 1;
      if (enemy.tier === "boss") {
        runState.bossesDefeated += 1;
      }
      appendLog(`${enemy.name} is deleted from the dungeon cache.`, "good", "enemy-defeated", { enemyId: enemy.id });
    }

    return finalDamage;
  }

  function fillTemplate(template, enemy) {
    return template.replace("{enemy}", enemy ? enemy.name : "the dungeon");
  }

  function processWeapon(weapon) {
    const runtime = runState.weaponRuntime[weapon.id];
    const behavior = weapon.behavior;

    runtime.cooldown -= 1;

    if (runtime.cooldown > 0) {
      return;
    }

    runtime.cooldown = Math.max(1, behavior.cooldownTicks - runState.player.speedModifier);

    if (behavior.type === "guard") {
      runtime.guard = 2;
      runtime.lastProc = "Anti-skip field";
      runtime.lastActiveTick = runState.tick;
      appendLog(weapon.logTemplates.hit, "good", "weapon-guard", { weaponId: weapon.id });
      return;
    }

    const targets = selectTargets(weapon);

    if (!targets.length) {
      return;
    }

    if (chance(runState, effectiveMissChance(weapon))) {
      runtime.combo = 0;
      runtime.lastProc = "Fizzle";
      runtime.lastActiveTick = runState.tick;
      appendLog(weapon.logTemplates.miss, "bad", "weapon-miss", { weaponId: weapon.id });
      return;
    }

    targets.forEach((target, index) => {
      let damage = behavior.baseDamage + (weapon.stats.damage || 0) * 2 + (weapon.stats.magic || 0) * 2;
      let tone = "good";
      let template = weapon.logTemplates.hit;
      const isCrit = chance(runState, behavior.critChance || 0);

      if (isCrit) {
        damage *= 1.8;
        template = weapon.logTemplates.crit || weapon.logTemplates.hit;
        tone = "chaos";
      }

      if (behavior.type === "multi-hit") {
        damage = behavior.baseDamage + index * 2;
      }

      if (behavior.type === "combo") {
        runtime.combo = clamp((runtime.combo || 0) + 1, 1, behavior.maxCombo || 4);
        damage += runtime.combo * (behavior.comboBonus || 0);
      }

      if (behavior.type === "splash" && index === 0) {
        livingEnemies().slice(1, 3).forEach((splashTarget) => {
          const splashDamage = applyDamage(splashTarget, behavior.splashDamage || 6, weapon, { splash: true });
          appendLog(`VHS tape shrapnel clips ${splashTarget.name} for ${splashDamage}.`, "good", "weapon-splash", { weaponId: weapon.id, enemyId: splashTarget.id });
        });
      }

      if (behavior.type === "debuff") {
        target.debuffs.confused = 2;
      }

      if (behavior.type === "mark") {
        target.marks = clamp((target.marks || 0) + 1, 0, 3);
      }

      if (behavior.type === "corrupt") {
        const roll = randomInt(runState, 1, 3);
        if (roll === 1) {
          damage *= 1.5;
        } else if (roll === 2) {
          target.debuffs.confused = 2;
        } else {
          runState.player.health = Math.min(runState.player.maxHealth, runState.player.health + 4);
        }
      }

      if (behavior.type === "wildcard") {
        const roll = randomInt(runState, 1, 4);
        if (roll === 1) {
          damage *= 2;
        } else if (roll === 2) {
          runState.player.health = Math.min(runState.player.maxHealth, runState.player.health + 8);
          appendLog("Tamagotchi Pendant of Doom reluctantly heals its keeper.", "chaos", "weapon-heal", { weaponId: weapon.id });
        } else if (roll === 3) {
          target.debuffs.confused = 1;
        } else {
          damage = Math.max(1, damage - 5);
        }
      }

      const finalDamage = applyDamage(target, damage, weapon, { crit: isCrit });
      runtime.lastProc = isCrit ? `Crit ${finalDamage}` : `Hit ${finalDamage}`;
      runtime.lastActiveTick = runState.tick;
      appendLog(`${fillTemplate(template, target)} (${finalDamage})`, tone, "weapon-hit", { weaponId: weapon.id, enemyId: target.id, damage: finalDamage });
    });
  }

  function processEnemies() {
    livingEnemies().forEach((enemy) => {
      enemy.attackCooldown -= 1;

      if (enemy.attackCooldown > 0) {
        return;
      }

      enemy.attackCooldown = Math.max(1, 4 - enemy.speed);

      if (enemy.debuffs.confused) {
        enemy.debuffs.confused -= 1;
        if (chance(runState, 0.45)) {
          appendLog(`${enemy.name} forgets its password and loses the turn.`, "good", "enemy-confused", { enemyId: enemy.id });
          return;
        }
      }

      const shield = runState.selectedWeapons.find((weapon) => weapon.behavior.type === "guard");
      const shieldRuntime = shield ? runState.weaponRuntime[shield.id] : null;
      const guarded = shieldRuntime && shieldRuntime.guard > 0;
      const blockChance = clamp(runState.player.blockChance + (guarded ? 0.15 : 0), 0, 0.65);
      const type = enemyById.get(enemy.typeId);

      if (chance(runState, blockChance)) {
        appendLog(`${type.attackText} Discman Shield blocks the worst of it.`, "good", "enemy-blocked", { enemyId: enemy.id });

        if (guarded && shield.behavior.reflectDamage) {
          const reflected = applyDamage(enemy, shield.behavior.reflectDamage, shield, { reflect: true });
          appendLog(`Discman Shield reflects ${reflected} damage into ${enemy.name}.`, "good", "weapon-reflect", { weaponId: shield.id, enemyId: enemy.id });
        }

        return;
      }

      const damage = Math.max(1, enemy.attack - Math.floor(runState.player.defense * 0.65));
      runState.player.health = Math.max(0, runState.player.health - damage);
      appendLog(`${type.attackText} (${damage})`, "bad", "enemy-attack", { enemyId: enemy.id, damage });
    });

    Object.values(runState.weaponRuntime).forEach((runtime) => {
      if (runtime.guard > 0) {
        runtime.guard -= 1;
      }
    });
  }

  function gameTick() {
    if (!runState || runState.phase !== "running" || runState.isWaveTransitioning) {
      return;
    }

    runState.tick += 1;
    runState.selectedWeapons.forEach(processWeapon);
    processEnemies();

    if (runState.player.health <= 0) {
      endRun("defeat");
      return;
    }

    if (!livingEnemies().length) {
      runState.isWaveTransitioning = true;
      runState.wavesSurvived = Math.max(runState.wavesSurvived, runState.waveNumber);
      runState.player.health = Math.min(runState.player.maxHealth, runState.player.health + 5 + runState.player.defense);
      appendLog(`Wave ${runState.waveNumber} cleared. The relics hum with bad confidence.`, "good", "wave-clear");
      updateCurrentScore();
      renderRun();
      clearTimeout(nextWaveTimer);
      nextWaveTimer = window.setTimeout(() => {
        if (runState && runState.phase === "running") {
          startWave(runState.waveNumber + 1);
        }
      }, 900);
      return;
    }

    updateCurrentScore();
    renderRun();
  }

  function updateCurrentScore() {
    if (!runState) {
      return;
    }

    runState.currentScore = calculateScore(runState).finalScore;
  }

  function calculateScore(run) {
    const chaosTotal = run.player.chaos || 0;
    const chaosBonus = Math.min(data.scoring.chaosCap, chaosTotal * run.wavesSurvived * data.scoring.chaosPerPointPerWave);
    const budgetEfficiencyBonus = Math.max(0, run.budgetLimit - run.selectedCost) * data.scoring.budgetEfficiency;
    const healthRemaining = Math.max(0, Math.round(run.player.health));
    const finalScore = Math.max(0,
      run.wavesSurvived * data.scoring.wave
      + run.enemiesDefeated * data.scoring.enemy
      + run.bossesDefeated * data.scoring.boss
      + healthRemaining * data.scoring.health
      + chaosBonus
      + budgetEfficiencyBonus
    );
    const clean = run.integrity.status !== "goblin";
    const prefix = run.selectedWeapons.some((weapon) => weapon.id === "vhs-greatsword")
      ? "VHS"
      : run.selectedWeapons.slice().sort((a, b) => b.cost - a.cost || b.stats.damage - a.stats.damage)[0].prefix;

    return {
      wavesSurvived: run.wavesSurvived,
      enemiesDefeated: run.enemiesDefeated,
      bossesDefeated: run.bossesDefeated,
      healthRemaining,
      chaosBonus,
      budgetEfficiencyBonus,
      cursedPenalty: 0,
      finalScore,
      status: clean ? "CLEAN RUN" : "CURSED RUN",
      runCode: `${prefix}-${finalScore}-W${run.wavesSurvived}-${clean ? "CLEAN" : "GOBLIN"}`,
      loadoutNames: run.selectedWeapons.map((weapon) => weapon.title),
      loadoutIds: run.selectedWeaponIds.slice(),
      integrity: run.integrity,
      eligibleForHallOfRelics: clean
    };
  }

  function endRun(reason) {
    if (!runState || runState.phase === "ended") {
      return;
    }

    clearInterval(runInterval);
    clearTimeout(nextWaveTimer);
    clearInterval(goblinDetectionTimer);
    runInterval = null;
    nextWaveTimer = null;
    goblinDetectionTimer = null;
    runState.phase = "ended";
    runState.endedAt = Date.now();

    if (reason === "forfeit") {
      appendLog("The run is sealed early. The dungeon keeps the receipt.", "bad", "run-end");
    } else {
      appendLog("The loadout collapses into smoking obsolete parts.", "bad", "run-end");
    }

    runState.result = calculateScore(runState);
    runState.result.savedScores = saveResult(runState.result);
    renderEnd();
  }

  function startRun() {
    if (!isSelectionValid()) {
      return;
    }

    clearInterval(runInterval);
    clearTimeout(nextWaveTimer);
    clearInterval(goblinDetectionTimer);
    runState = createRun();
    goblinOverlayShown = false;
    document.documentElement.classList.remove("is-goblin-mode");
    appendLog("The dungeon boots from a questionable floppy disk.", "normal", "run-start");
    startWave(1);
    runInterval = window.setInterval(gameTick, data.tickMs);
    installGoblinDetection();
  }

  function healthPercent() {
    if (!runState) {
      return 0;
    }

    return clamp((runState.player.health / runState.player.maxHealth) * 100, 0, 100);
  }

  function renderRun() {
    if (!runState) {
      return;
    }

    const clean = runState.integrity.status !== "goblin";
    const latestEvent = runState.battleLog[0];
    const living = livingEnemies();
    const boss = living.find((enemy) => enemy.tier === "boss");
    const threatLabel = boss ? `${boss.name} active` : living.length ? `${living.length} hostiles active` : "Wave compiling";
    const hudMarkup = `
      <div class="hud-cell hud-cell--wave">
        <span>Wave</span>
        <strong>${runState.waveNumber}</strong>
      </div>
      <div class="hud-cell health-meter">
        <span>Health</span>
        <strong>${Math.ceil(runState.player.health)} / ${runState.player.maxHealth}</strong>
        <div class="health-meter__track"><span style="width: ${healthPercent()}%"></span></div>
      </div>
      <div class="hud-cell">
        <span>Score</span>
        <strong class="${clean ? "" : "corrupted-label"}">${runState.currentScore.toLocaleString()}</strong>
      </div>
      <div class="hud-cell">
        <span>Status</span>
        <strong class="${clean ? "status-clean" : "status-cursed"}">${clean ? "CLEAN RUN" : "CURSED RUN"}</strong>
      </div>
      <div class="hud-cell hud-cell--event">
        <span>Threat</span>
        <strong>${escapeHtml(threatLabel)}</strong>
        <small>${latestEvent ? escapeHtml(latestEvent.message) : "Dungeon booting..."}</small>
      </div>
    `;
    const playerMarkup = `
      <div class="panel-head">
        <div>
          <p class="battle-label">Player Rig</p>
          <h2>Equipped Relics</h2>
        </div>
        <span>${runState.selectedWeapons.length} Online</span>
      </div>
      <div class="rig-health">
        <span>Core Integrity</span>
        <strong>${Math.ceil(healthPercent())}%</strong>
        <div class="health-meter__track"><span style="width: ${healthPercent()}%"></span></div>
      </div>
      <div class="player-side">
        <div class="runtime-weapons">
          ${runState.selectedWeapons.map(renderRuntimeWeapon).join("")}
        </div>
      </div>
      <div class="passive-summary">
        <span>Loadout Summary</span>
        <strong>${escapeHtml(loadoutSummary())}</strong>
      </div>
      <button class="memetic-button rig-end-button" type="button" data-forfeit-run>End Run</button>
    `;
    const arenaMarkup = `
      <div class="arena-head">
        <div>
          <p class="battle-label">Combat Arena</p>
          <h2>${runState.isWaveTransitioning ? "Wave Cleared" : `Wave ${runState.waveNumber}`}</h2>
        </div>
        <span>${escapeHtml(threatLabel)}</span>
      </div>
      <div class="enemy-side">
        <div class="enemy-list">
          ${living.map(renderEnemy).join("") || `<div class="enemy-card is-empty">Compiling next wave...</div>`}
        </div>
      </div>
      <div class="arena-event-strip">
        ${runState.battleLog.slice(0, 3).map(renderArenaCallout).join("")}
      </div>
      ${clean ? "" : `<div class="cursed-stamp">CURSED RUN</div>`}
    `;
    const feedMarkup = `
      <div class="battle-log__head">
        <h2>Battle Feed</h2>
        <span>${runState.battleLog.length} Events</span>
      </div>
      <div class="battle-log__list">
        ${runState.battleLog.slice(0, 18).map(renderLogEvent).join("")}
      </div>
    `;

    app.className = `memetic-app is-running${clean ? "" : " is-cursed"}`;

    const existingHud = app.querySelector(".run-hud");
    const existingRig = app.querySelector(".player-rig-panel");
    const existingArena = app.querySelector(".combat-arena");
    const existingFeed = app.querySelector(".battle-feed");

    if (existingHud && existingRig && existingArena && existingFeed) {
      existingHud.innerHTML = hudMarkup;
      existingRig.innerHTML = playerMarkup;
      existingArena.innerHTML = arenaMarkup;
      existingFeed.innerHTML = feedMarkup;

      const existingIndicator = app.querySelector(".goblin-indicator");
      if (!clean && !existingIndicator) {
        app.insertAdjacentHTML("beforeend", renderGoblinIndicator());
      } else if (clean && existingIndicator) {
        existingIndicator.remove();
      }
      return;
    }

    app.innerHTML = `
      <header class="run-hud">${hudMarkup}</header>
      <div class="run-layout">
        <aside class="player-rig-panel" aria-label="Player rig">${playerMarkup}</aside>
        <section class="battlefield combat-arena" aria-label="Combat arena">${arenaMarkup}</section>
        <aside class="battle-log battle-feed" aria-label="Battle feed">${feedMarkup}</aside>
      </div>
      ${clean ? "" : renderGoblinIndicator()}
    `;
  }

  function loadoutSummary() {
    const tagCounts = new Map();
    runState.selectedWeapons.forEach((weapon) => {
      weapon.tags.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1));
    });

    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([tag]) => tag.toUpperCase())
      .join(" / ") || "NO PASSIVES";
  }

  function renderRuntimeWeapon(weapon) {
    const runtime = runState.weaponRuntime[weapon.id];
    const cooldown = Math.max(0, runtime.cooldown);
    const item = displayWeapon(weapon);
    const active = runState.tick - runtime.lastActiveTick <= 1;
    const state = weapon.behavior.type === "guard" && runtime.guard > 0
      ? "Passive"
      : cooldown
        ? `Cooldown ${cooldown}`
        : "Ready";

    return `
      <div class="runtime-weapon${active ? " is-active" : ""}">
        ${item.image ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" decoding="async">` : `<span>${escapeHtml(weapon.prefix)}</span>`}
        <div>
          <strong>${escapeHtml(weapon.title)}</strong>
          <span>${escapeHtml(weapon.tags.slice(0, 2).join(" / "))}</span>
          <em>${escapeHtml(state)}</em>
          ${runtime.lastProc ? `<small>${escapeHtml(runtime.lastProc)}</small>` : ""}
        </div>
      </div>
    `;
  }

  function renderEnemy(enemy) {
    const percent = clamp((enemy.health / enemy.maxHealth) * 100, 0, 100);
    const hit = runState.tick - enemy.lastHitTick <= 1;
    const flags = [
      enemy.debuffs.confused ? "confused" : "",
      enemy.marks ? "marked" : ""
    ].filter(Boolean);
    const intent = enemy.attackCooldown <= 1 ? "Attacking" : `Intent ${enemy.attackCooldown}`;

    return `
      <div class="enemy-card${enemy.tier === "boss" ? " is-boss" : ""}${hit ? " is-hit" : ""}">
        ${hit ? `<span class="floating-damage">-${enemy.lastDamage}</span>` : ""}
        <div class="enemy-card__top">
          <strong>${escapeHtml(enemy.name)}</strong>
          <span>${escapeHtml(enemy.tier)}</span>
        </div>
        <div class="enemy-tags">
          ${flags.map((flag) => `<span>${escapeHtml(flag)}</span>`).join("") || `<span>active</span>`}
          <span>${escapeHtml(intent)}</span>
        </div>
        <div class="enemy-health"><span style="width: ${percent}%"></span></div>
        <div class="enemy-card__foot">
          <small>${Math.ceil(enemy.health)} / ${enemy.maxHealth} HP</small>
          <small>ATK ${enemy.attack}</small>
        </div>
      </div>
    `;
  }

  function renderLogEvent(event) {
    return `
      <p class="log-event log-event--${escapeHtml(event.tone)} log-event--${escapeHtml(event.type)}">
        <span>${escapeHtml(eventLabel(event))}</span>
        ${escapeHtml(event.message)}
      </p>
    `;
  }

  function renderArenaCallout(event) {
    return `<span class="arena-callout arena-callout--${escapeHtml(event.tone)}">${escapeHtml(eventLabel(event))}</span>`;
  }

  function eventLabel(event) {
    if (event.type.includes("wave")) {
      return "SYSTEM";
    }

    if (event.type.includes("enemy")) {
      return event.tone === "bad" ? "ENEMY" : "TARGET";
    }

    if (event.type.includes("guard") || event.type.includes("block") || event.type.includes("reflect")) {
      return "BLOCK";
    }

    if (event.tone === "chaos") {
      return "CHAOS";
    }

    if (event.type.includes("miss")) {
      return "FIZZLE";
    }

    return "HIT";
  }

  function renderGoblinIndicator() {
    return `
      <div class="goblin-indicator" aria-label="Goblin Mode active">
        <span></span><span></span>
        <strong>GOBLIN MODE</strong>
      </div>
    `;
  }

  function renderEnd() {
    const result = runState.result;
    const clean = result.integrity.status !== "goblin";
    const shareText = `I survived Wave ${result.wavesSurvived} with ${result.loadoutNames.join(", ")}. Score: ${result.finalScore.toLocaleString()}. Status: ${result.status}. Run Code: ${result.runCode}.`;
    const scores = result.savedScores || readScores();
    lastCopiedText = shareText;
    app.className = `memetic-app is-ended${clean ? "" : " is-cursed"}`;
    document.documentElement.classList.toggle("is-goblin-mode", !clean);
    app.innerHTML = `
      <section class="result-screen">
        <div class="result-card${clean ? "" : " is-cursed"}">
          <p class="memetic-kicker">Run Complete</p>
          <h1>${escapeHtml(result.status)}</h1>
          ${clean ? `<p class="result-eligibility">Eligible for Hall of Relics</p>` : `<p class="result-eligibility is-danger">Reason: Cheat Goblin detected. Not eligible for Hall of Relics.</p>`}
          <div class="result-code">${escapeHtml(result.runCode)}</div>
          ${clean ? "" : `<div class="cursed-stamp result-stamp">CURSED RUN / GOBLIN MODE</div>`}
        </div>

        <div class="result-grid">
          ${renderResultStat("Final Score", result.finalScore.toLocaleString())}
          ${renderResultStat("Waves Survived", result.wavesSurvived)}
          ${renderResultStat("Enemies Defeated", result.enemiesDefeated)}
          ${renderResultStat("Bosses Defeated", result.bossesDefeated)}
          ${renderResultStat("Health Remaining", result.healthRemaining)}
          ${renderResultStat("Chaos Bonus", result.chaosBonus)}
        </div>

        <section class="result-loadout" aria-label="Final loadout">
          <h2>Selected Loadout</h2>
          <div class="runtime-weapons">
            ${runState.selectedWeapons.map(renderRuntimeWeaponStatic).join("")}
          </div>
        </section>

        <section class="share-panel" aria-label="Share result">
          <h2>Share Result</h2>
          <textarea readonly data-share-text>${escapeHtml(shareText)}</textarea>
          <div class="share-actions">
            <button class="memetic-button memetic-button--primary" type="button" data-copy-result>Copy Result</button>
            <button class="memetic-button" type="button" data-run-again>Run Again</button>
            <button class="memetic-button" type="button" data-change-loadout>Change Loadout</button>
          </div>
        </section>

        <section class="local-score-panel" aria-label="Local high scores">
          <h2>Local Relics</h2>
          <div class="result-grid">
            ${renderResultStat("Best Clean Score", scores.bestClean ? `${scores.bestClean.score.toLocaleString()} / W${scores.bestClean.wavesSurvived}` : "None yet")}
            ${renderResultStat("Best Cursed Score", scores.bestGoblin ? `${scores.bestGoblin.score.toLocaleString()} / W${scores.bestGoblin.wavesSurvived}` : "None yet")}
          </div>
          <p>${escapeHtml(data.rulesNote)}</p>
        </section>
      </section>
    `;
  }

  function renderResultStat(label, value) {
    return `
      <div class="result-stat">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `;
  }

  function renderRuntimeWeaponStatic(weapon) {
    const item = displayWeapon(weapon);
    return `
      <div class="runtime-weapon">
        ${item.image ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" decoding="async">` : `<span>${escapeHtml(weapon.prefix)}</span>`}
        <div>
          <strong>${escapeHtml(weapon.title)}</strong>
          <span>$${weapon.cost} / ${weapon.tags.join(" / ")}</span>
        </div>
      </div>
    `;
  }

  function copyResult() {
    const textarea = app.querySelector("[data-share-text]");
    const text = textarea ? textarea.value : lastCopiedText;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showCopyState("Copied")).catch(() => fallbackCopy(textarea));
      return;
    }

    fallbackCopy(textarea);
  }

  function fallbackCopy(textarea) {
    if (!textarea) {
      return;
    }

    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
      showCopyState("Copied");
    } catch (error) {
      showCopyState("Select text");
    }
  }

  function showCopyState(label) {
    const button = app.querySelector("[data-copy-result]");
    if (!button) {
      return;
    }

    const original = button.textContent;
    button.textContent = label;
    window.setTimeout(() => {
      button.textContent = original;
    }, 1200);
  }

  function markGoblinMode(reason) {
    if (!runState || runState.phase !== "running" || runState.integrity.status === "goblin") {
      return;
    }

    runState.integrity = {
      status: "goblin",
      reason,
      detectedAt: Date.now()
    };
    document.documentElement.classList.add("is-goblin-mode");
    appendLog("THE CHEAT GOBLIN HAS ENTERED THE CHAT.", "chaos", "goblin");
    renderRun();
    showGoblinOverlay();
  }

  function showGoblinOverlay() {
    if (goblinOverlayShown) {
      return;
    }

    goblinOverlayShown = true;
    const overlay = document.createElement("div");
    overlay.className = "goblin-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="goblin-overlay__panel">
        <p class="memetic-kicker">Integrity Flag</p>
        <h2>THE CHEAT GOBLIN HAS ENTERED THE CHAT</h2>
        <p>Your run has been marked as cursed.</p>
        <p>Scores from cursed runs are not eligible for the Hall of Relics.</p>
        <button class="memetic-button memetic-button--primary" type="button" data-dismiss-goblin>Continue Run</button>
      </div>
    `;
    document.body.append(overlay);
    overlay.querySelector("[data-dismiss-goblin]").focus();
  }

  function installGoblinDetection() {
    clearInterval(goblinDetectionTimer);

    let largeGapReadings = 0;
    const dimensionCheck = () => {
      if (!runState || runState.phase !== "running") {
        return;
      }

      const widthGap = Math.abs(window.outerWidth - window.innerWidth);
      const heightGap = Math.abs(window.outerHeight - window.innerHeight);
      const widthRatio = window.innerWidth ? widthGap / window.innerWidth : 0;
      const heightRatio = window.innerHeight ? heightGap / window.innerHeight : 0;
      const looksDocked = (widthGap > 300 && widthRatio > 0.28) || (heightGap > 260 && heightRatio > 0.28);

      largeGapReadings = looksDocked ? largeGapReadings + 1 : 0;

      if (largeGapReadings >= 3) {
        markGoblinMode("Cheat Goblin detected");
        clearInterval(goblinDetectionTimer);
        goblinDetectionTimer = null;
      }
    };

    goblinDetectionTimer = window.setInterval(dimensionCheck, 1500);
  }

  function handleKeydown(event) {
    const key = normalize(event.key);
    const devToolsCombo = event.key === "F12"
      || (event.ctrlKey && event.shiftKey && key === "i")
      || (event.metaKey && event.altKey && key === "i");

    if (devToolsCombo) {
      markGoblinMode("Cheat Goblin detected");
    }
  }

  app.addEventListener("click", (event) => {
    const selectButton = event.target.closest("[data-select-weapon]");
    const removeButton = event.target.closest("[data-remove-weapon]");

    if (selectButton) {
      const id = selectButton.dataset.selectWeapon;
      const weapon = getWeapon(id);

      if (!weapon) {
        return;
      }

      if (selectedWeaponIds.includes(id)) {
        selectedWeaponIds = selectedWeaponIds.filter((weaponId) => weaponId !== id);
      } else if (canSelect(weapon)) {
        selectedWeaponIds.push(id);
      }

      renderSelection();
      return;
    }

    if (removeButton) {
      selectedWeaponIds = selectedWeaponIds.filter((weaponId) => weaponId !== removeButton.dataset.removeWeapon);
      renderSelection();
      return;
    }

    if (event.target.closest("[data-clear-loadout]")) {
      selectedWeaponIds = [];
      renderSelection();
      return;
    }

    if (event.target.closest("[data-start-run]")) {
      startRun();
      return;
    }

    if (event.target.closest("[data-forfeit-run]")) {
      endRun("forfeit");
      return;
    }

    if (event.target.closest("[data-copy-result]")) {
      copyResult();
      return;
    }

    if (event.target.closest("[data-run-again]")) {
      startRun();
      return;
    }

    if (event.target.closest("[data-change-loadout]")) {
      clearInterval(runInterval);
      clearTimeout(nextWaveTimer);
      clearInterval(goblinDetectionTimer);
      goblinDetectionTimer = null;
      runState = null;
      document.documentElement.classList.remove("is-goblin-mode");
      renderSelection();
    }
  });

  document.addEventListener("click", (event) => {
    const dismiss = event.target.closest("[data-dismiss-goblin]");
    if (!dismiss) {
      return;
    }

    const overlay = dismiss.closest(".goblin-overlay");
    if (overlay) {
      overlay.remove();
    }
  });

  document.addEventListener("keydown", handleKeydown);
  renderSelection();
}());
