(() => {
  const type = document.getElementById("report_type");
  const subjectWrap = document.getElementById("subject_wrap");
  const subjectLabel = document.getElementById("subject_label");
  const subject = document.getElementById("subject_choice");

  if (!type || !subjectWrap || !subjectLabel || !subject) return;

  const options = {
    ghost: [
      "The Lady in Lavender",
      "The Headless Choirboy",
      "Dockside Drifter",
      "The Mirror Whisperer",
      "Polite Victorian (won’t bite)"
    ],
    animal: [
      "Miniature Griffin",
      "Mischievous Niffler",
      "Runaway Hippogriff",
      "Glow-toad (bioluminescent)",
      "Invisicat (may be on your lap)"
    ],
    other: [
      "—"
    ]
  };

  function setOptions(list) {
    subject.innerHTML = "";
    for (const item of list) {
      const opt = document.createElement("option");
      opt.value = item === "—" ? "" : item;
      opt.textContent = item;
      subject.appendChild(opt);
    }
  }

  function updateUI() {
    const v = type.value;

    if (v === "ghost") {
      subjectWrap.style.display = "";
      subjectLabel.textContent = "Pick a ghost *";
      subject.required = true;
      setOptions(options.ghost);
    } else if (v === "animal") {
      subjectWrap.style.display = "";
      subjectLabel.textContent = "Pick a magical animal *";
      subject.required = true;
      setOptions(options.animal);
    } else {
      // other
      subjectWrap.style.display = "none";
      subject.required = false;
      subject.value = "";
    }
  }

  type.addEventListener("change", updateUI);
  updateUI();
})();
