(() => {
  window.addEventListener("scroll", () => {
    if (window.scrollX !== 0) {
      window.scrollTo(0, window.scrollY);
    }
  }, { passive: true });

  const input = document.getElementById("input-list");
  const output = document.getElementById("output-list");
  const message = document.getElementById("processing-message");
  const resultSummary = document.getElementById("result-summary");
  const inputLineCount = document.getElementById("input-line-count");
  const inputCharCount = document.getElementById("input-char-count");
  const outputLineCount = document.getElementById("output-line-count");
  const outputCharCount = document.getElementById("output-char-count");
  const caseSensitiveDedupe = document.getElementById("case-sensitive-dedupe");
  const prefixField = document.getElementById("prefix-field");
  const suffixField = document.getElementById("suffix-field");
  const numberingEnabled = document.getElementById("numbering-enabled");
  const numberStart = document.getElementById("number-start");
  const numberFormat = document.getElementById("number-format");
  const customSeparator = document.getElementById("custom-separator");
  const actionButtons = [...document.querySelectorAll("[data-action]")];
  const outputButtons = {
    copy: document.getElementById("copy-result"),
    download: document.getElementById("download-result"),
    replace: document.getElementById("replace-input"),
    undo: document.getElementById("undo-last"),
    clear: document.getElementById("clear-result")
  };

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const sample = [
    "  Item 10  ",
    "",
    "item 2",
    "Item 2",
    "  apple, banana, banana, cherry",
    "003. Old numbered line",
    "Item 1",
    "item 2"
  ].join("\n");

  let undoStack = [];
  let lastOperation = "";

  function getSourceText() {
    return output.value.length ? output.value : input.value;
  }

  function getLines(text = getSourceText()) {
    return text.split(/\r?\n/);
  }

  function nonEmptyLines(text = getSourceText()) {
    return getLines(text).filter((line) => line.trim() !== "");
  }

  function countLines(text) {
    if (!text) {
      return 0;
    }
    return text.split(/\r?\n/).length;
  }

  function summarize(text, operation) {
    const lines = countLines(text);
    const chars = text.length;
    return `${operation}: ${lines} line${lines === 1 ? "" : "s"}, ${chars} character${chars === 1 ? "" : "s"}.`;
  }

  function setMessage(text) {
    message.textContent = text;
  }

  function pushUndo() {
    undoStack.push(output.value);
    if (undoStack.length > 30) {
      undoStack.shift();
    }
  }

  function applyResult(text, operation) {
    pushUndo();
    output.value = text;
    lastOperation = operation;
    resultSummary.textContent = summarize(text, operation);
    setMessage(resultSummary.textContent);
    updateState();
  }

  function updateStats() {
    inputLineCount.textContent = countLines(input.value);
    inputCharCount.textContent = input.value.length;
    outputLineCount.textContent = countLines(output.value);
    outputCharCount.textContent = output.value.length;
  }

  function updateState() {
    const hasSource = getSourceText().length > 0;
    const hasOutput = output.value.length > 0;

    actionButtons.forEach((button) => {
      button.disabled = !hasSource;
    });

    outputButtons.copy.disabled = !hasOutput;
    outputButtons.download.disabled = !hasOutput;
    outputButtons.replace.disabled = !hasOutput;
    outputButtons.clear.disabled = !hasOutput;
    outputButtons.undo.disabled = undoStack.length === 0;
    updateStats();
  }

  function toTitleCase(line) {
    return line.toLowerCase().replace(/\b([\p{L}\p{N}])/gu, (match) => match.toUpperCase());
  }

  function shuffle(lines) {
    const result = [...lines];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function stripNumbering(line) {
    return line.replace(/^\s*(?:\d+[\.)]\s+|\d{2,}\s+)/, "");
  }

  function formatNumber(value, format) {
    if (format === "paren") {
      return `${value}) `;
    }
    if (format === "padded") {
      return `${String(value).padStart(2, "0")} `;
    }
    return `${value}. `;
  }

  function splitBy(separator, label) {
    if (!separator) {
      setMessage("Enter a custom separator first.");
      return;
    }
    const parts = getSourceText()
      .split(separator)
      .map((part) => part.trim())
      .filter(Boolean);
    applyResult(parts.join("\n"), label);
  }

  function joinWith(separator, label) {
    const text = nonEmptyLines().map((line) => line.trim()).join(separator);
    applyResult(text, label);
  }

  const operations = {
    trim() {
      applyResult(getLines().map((line) => line.trim()).join("\n"), "Trimmed whitespace");
    },
    removeBlank() {
      applyResult(nonEmptyLines().join("\n"), "Removed blank lines");
    },
    dedupe() {
      const seen = new Set();
      const lines = getLines().filter((line) => {
        const key = caseSensitiveDedupe.checked ? line : line.toLowerCase();
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
      applyResult(lines.join("\n"), "Removed duplicates");
    },
    sortAsc() {
      applyResult(nonEmptyLines().sort(collator.compare).join("\n"), "Sorted A-Z");
    },
    sortDesc() {
      applyResult(nonEmptyLines().sort((a, b) => collator.compare(b, a)).join("\n"), "Sorted Z-A");
    },
    reverse() {
      applyResult(getLines().reverse().join("\n"), "Reversed order");
    },
    randomize() {
      applyResult(shuffle(nonEmptyLines()).join("\n"), "Randomized order");
    },
    applyCase() {
      const mode = document.querySelector("input[name='case-mode']:checked").value;
      const next = getLines().map((line) => {
        if (mode === "lower") {
          return line.toLowerCase();
        }
        if (mode === "upper") {
          return line.toUpperCase();
        }
        if (mode === "title") {
          return toTitleCase(line);
        }
        return line;
      });
      applyResult(next.join("\n"), `Applied ${mode === "keep" ? "original case" : mode}`);
    },
    applyAffixes() {
      const prefix = prefixField.value;
      const suffix = suffixField.value;
      applyResult(getLines().map((line) => `${prefix}${line}${suffix}`).join("\n"), "Applied prefix and suffix");
    },
    applyNumbering() {
      if (!numberingEnabled.checked) {
        setMessage("Enable numbering first.");
        return;
      }
      const start = Number.parseInt(numberStart.value, 10);
      const base = Number.isFinite(start) ? start : 1;
      let index = base;
      const next = getLines().map((line) => {
        if (line.trim() === "") {
          return line;
        }
        const numbered = `${formatNumber(index, numberFormat.value)}${line}`;
        index += 1;
        return numbered;
      });
      applyResult(next.join("\n"), "Applied numbering");
    },
    removeNumbering() {
      applyResult(getLines().map(stripNumbering).join("\n"), "Removed numbering");
    },
    splitComma() {
      splitBy(",", "Split comma-separated text");
    },
    splitSemicolon() {
      splitBy(";", "Split semicolon-separated text");
    },
    splitCustom() {
      splitBy(customSeparator.value, "Split custom separator");
    },
    joinComma() {
      joinWith(", ", "Joined lines with comma");
    },
    joinSemicolon() {
      joinWith("; ", "Joined lines with semicolon");
    },
    joinCustom() {
      if (!customSeparator.value) {
        setMessage("Enter a custom separator first.");
        return;
      }
      joinWith(customSeparator.value, "Joined lines with custom separator");
    }
  };

  async function copyResult() {
    if (!output.value) {
      return;
    }
    output.readOnly = false;
    output.focus();
    output.select();
    try {
      const copied = document.execCommand("copy");
      if (!copied) {
        throw new Error("Copy command failed");
      }
      setMessage("Copied repaired list to clipboard.");
    } catch {
      try {
        await navigator.clipboard.writeText(output.value);
        setMessage("Copied repaired list to clipboard.");
      } catch {
        setMessage("Copy failed. Select the repaired list and copy manually.");
      }
    } finally {
      output.readOnly = true;
    }
  }

  function downloadResult() {
    if (!output.value) {
      return;
    }
    const blob = new Blob([output.value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "list-mechanic-result.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage("Downloaded list-mechanic-result.txt.");
  }

  function replaceInput() {
    if (!output.value) {
      return;
    }
    input.value = output.value;
    output.value = "";
    undoStack = [];
    resultSummary.textContent = "Result moved into Incoming Mess.";
    setMessage("Input replaced with repaired list.");
    updateState();
  }

  function undoLast() {
    if (!undoStack.length) {
      return;
    }
    output.value = undoStack.pop();
    if (output.value) {
      resultSummary.textContent = summarize(output.value, "Undid last transformation");
      setMessage(`Undid ${lastOperation || "last transformation"}.`);
    } else {
      resultSummary.textContent = "No output yet.";
      setMessage("Undid last transformation. Output cleared.");
    }
    updateState();
  }

  actionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const operation = operations[button.dataset.action];
      if (operation) {
        operation();
      }
    });
  });

  input.addEventListener("input", () => {
    updateState();
    if (!output.value) {
      resultSummary.textContent = "No output yet.";
      setMessage(input.value ? "Incoming mess updated." : "Awaiting incoming mess.");
    }
  });

  document.getElementById("clear-input").addEventListener("click", () => {
    input.value = "";
    setMessage("Incoming Mess cleared.");
    updateState();
  });

  document.getElementById("load-sample").addEventListener("click", () => {
    input.value = sample;
    setMessage("Sample mess loaded.");
    updateState();
  });

  outputButtons.copy.addEventListener("click", copyResult);
  outputButtons.download.addEventListener("click", downloadResult);
  outputButtons.replace.addEventListener("click", replaceInput);
  outputButtons.undo.addEventListener("click", undoLast);
  outputButtons.clear.addEventListener("click", () => {
    output.value = "";
    undoStack = [];
    resultSummary.textContent = "No output yet.";
    setMessage("Repaired List cleared.");
    updateState();
  });

  updateState();
})();
