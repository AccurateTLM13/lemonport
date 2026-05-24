(function () {
  "use strict";

  const mapZones = [
    {
      id: "what-if",
      title: "WHAT IF WOODS",
      label: "PARODY / CONCEPTS",
      description: "Alternate brands and cursed interfaces.",
      url: "/what-if/"
    },
    {
      id: "memetic",
      title: "MEMETIC ARENA",
      label: "GAME / WARFARE",
      description: "Combat, strategy, and internet weaponry.",
      url: "/memetic-warfare/"
    },
    {
      id: "archive",
      title: "ARCHIVE CAVERN",
      label: "FULL / COLLECTION",
      description: "The complete visual record.",
      url: "/archive/"
    },
    {
      id: "junk-drawer",
      title: "JUNK DRAWER DISTRICT",
      label: "TOOLS / UTILITIES",
      description: "Tools, converters, and digital oddities.",
      url: "/junk-drawer/"
    },
    {
      id: "lemon-dom",
      title: "LEMON DOM",
      label: "EFFECTS / DOM",
      description: "Juicy UI effects for plain old websites.",
      url: "/lemon-dom/"
    },
    {
      id: "vrg",
      title: "VRG VAULT",
      label: "CARDS / COLLECTIBLES",
      description: "A collection of visual trading cards.",
      url: "/vrg-cards/"
    },
    {
      id: "fm",
      title: "FM TOWER",
      label: "SIGNAL / AUDIO",
      description: "Songs, playlists, and audio nonsense.",
      url: "/lemonteed-fm/"
    },
    {
      id: "studio",
      title: "STUDIO LAB",
      label: "BUILD / PROCESS",
      description: "The operator's desk. Where things are built.",
      url: "/operator-log/"
    },
    {
      id: "coming-soon",
      title: "COMING SOON CRATER",
      label: "UNSTABLE / TEASERS",
      description: "A smoking impact site. Something is unearthing.",
      url: ""
    }
  ];

  const zoneById = new Map(mapZones.map((zone) => [zone.id, zone]));

  function isMobile() {
    return window.matchMedia("(max-width: 760px)").matches;
  }

  function zoneForElement(element) {
    return element ? zoneById.get(element.dataset.zone || "") : null;
  }

  function initAtlas() {
    const layer = document.querySelector(".zone-layer");
    const mapShell = document.querySelector(".map-viewport");
    const dock = document.getElementById("zone-dock");
    const drawer = document.getElementById("zone-drawer");
    const zones = Array.from(document.querySelectorAll(".zone[data-zone]"));

    if (!layer || !zones.length) {
      return;
    }

    let activeZoneId = "";
    let drawerZoneId = "";

    function setActive(zoneId) {
      activeZoneId = zoneId || "";
      layer.classList.toggle("has-active", Boolean(activeZoneId));

      zones.forEach((zoneElement) => {
        zoneElement.classList.toggle("is-active", zoneElement.dataset.zone === activeZoneId);
      });

      if (dock) {
        Array.from(dock.querySelectorAll("[data-target]")).forEach((button) => {
          button.classList.toggle("is-active", button.dataset.target === activeZoneId);
        });
      }
    }

    function closeDrawer() {
      if (!drawer) {
        return;
      }

      drawer.hidden = true;
      drawer.textContent = "";
      drawerZoneId = "";
      setActive("");
    }

    function renderDrawer(zone) {
      if (!drawer || !zone) {
        return;
      }

      drawer.textContent = "";

      const close = document.createElement("button");
      close.className = "zone-drawer__close";
      close.type = "button";
      close.setAttribute("aria-label", "Close zone details");
      close.textContent = "x";

      const label = document.createElement("span");
      label.className = "zone-drawer__label";
      label.textContent = zone.label;

      const title = document.createElement("h2");
      title.className = "zone-drawer__title";
      title.textContent = zone.title;

      const desc = document.createElement("p");
      desc.className = "zone-drawer__desc";
      desc.textContent = zone.description;

      drawer.append(close, label, title, desc);

      if (zone.url) {
        const cta = document.createElement("a");
        cta.className = "zone-drawer__cta";
        cta.href = zone.url;
        cta.textContent = `Enter ${zone.title}`;
        drawer.append(cta);
      } else {
        const disabled = document.createElement("span");
        disabled.className = "zone-drawer__disabled";
        disabled.textContent = "TEASER LOADED";
        drawer.append(disabled);
      }

      close.addEventListener("click", closeDrawer);
      drawerZoneId = zone.id;
      drawer.hidden = false;
    }

    function centerZone(zoneElement) {
      if (!mapShell || !zoneElement) {
        return;
      }

      const shellRect = mapShell.getBoundingClientRect();
      const zoneRect = zoneElement.getBoundingClientRect();
      const left = mapShell.scrollLeft + zoneRect.left - shellRect.left - (shellRect.width / 2) + (zoneRect.width / 2);

      mapShell.scrollTo({
        left,
        behavior: "smooth"
      });
    }

    function activateZone(zoneId, options) {
      const zoneElement = zones.find((item) => item.dataset.zone === zoneId);
      const zone = zoneById.get(zoneId);

      if (!zone || !zoneElement) {
        return;
      }

      setActive(zoneId);

      if (options && options.center) {
        centerZone(zoneElement);
      }

      if (options && options.drawer) {
        renderDrawer(zone);
      }
    }

    zones.forEach((zoneElement) => {
      zoneElement.addEventListener("mouseenter", () => {
        if (!isMobile() && !drawerZoneId) {
          activateZone(zoneElement.dataset.zone);
        }
      });

      zoneElement.addEventListener("mouseleave", () => {
        if (!isMobile() && !drawerZoneId) {
          setActive("");
        }
      });

      zoneElement.addEventListener("focus", () => {
        if (!isMobile() && !drawerZoneId) {
          activateZone(zoneElement.dataset.zone);
        }
      });

      zoneElement.addEventListener("blur", () => {
        if (!isMobile() && !drawerZoneId) {
          setActive("");
        }
      });

      zoneElement.addEventListener("click", (event) => {
        const zone = zoneForElement(zoneElement);

        if (!zone) {
          return;
        }

        if (zone.url && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) {
          return;
        }

        event.preventDefault();
        activateZone(zone.id, { center: isMobile(), drawer: true });
      });
    });

    if (dock) {
      mapZones.forEach((zone) => {
        const button = document.createElement("button");
        button.className = "dock-card";
        button.type = "button";
        button.dataset.target = zone.id;

        const title = document.createElement("strong");
        title.textContent = zone.title;

        const label = document.createElement("span");
        label.textContent = zone.label;

        button.append(title, label);
        button.addEventListener("click", () => activateZone(zone.id, { center: true, drawer: true }));
        dock.append(button);
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
    });
  }

  function initParallax() {
    const props = Array.from(document.querySelectorAll(".prop"));

    if (!props.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const rotations = new Map([
      ["prop-tablet", 7],
      ["prop-knife", 1],
      ["prop-tamagotchi", 10],
      ["prop-cards", 6],
      ["prop-lemon", -5]
    ]);

    document.addEventListener("mousemove", (event) => {
      if (isMobile()) {
        return;
      }

      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;

      props.forEach((prop, index) => {
        const depth = (index + 1) * 5;
        const rotationEntry = Array.from(rotations.entries()).find(([className]) => prop.classList.contains(className));
        const rotation = rotationEntry ? rotationEntry[1] : 0;
        prop.style.transform = `translate(${x * depth}px, ${y * depth}px) rotate(${rotation}deg)`;
      });
    }, { passive: true });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initAtlas();
    initParallax();
  });
}());
