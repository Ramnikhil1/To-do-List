// ------- Simple To-Do App with localStorage, filters & drag-sort -------
(() => {
  const STORAGE_KEY = "todo-items-v1";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const form = $("#todo-form");
  const input = $("#todo-input");
  const list = $("#todo-list");
  const template = $("#todo-item-template");
  const filters = $$(".filter");
  const clearBtn = $("#clear-completed");
  const itemsLeft = $("#items-left");

  let state = {
    items: load(),
    filter: "all", // all | active | completed
  };

  render();

  // --- Event: Add task
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = input.value.trim();
    if (!title) return;
    state.items.push(makeItem(title));
    input.value = "";
    persistAndRender();
  });

  // --- Event: Filter switch
  filters.forEach((btn) =>
    btn.addEventListener("click", () => {
      state.filter = btn.dataset.filter;
      filters.forEach((b) => b.classList.toggle("active", b === btn));
      filters.forEach((b) => b.setAttribute("aria-selected", b === btn ? "true" : "false"));
      render();
    })
  );

  // --- Event: Clear completed
  clearBtn.addEventListener("click", () => {
    state.items = state.items.filter((t) => !t.completed);
    persistAndRender();
  });

  // --- Event delegation for list interactions
  list.addEventListener("click", (e) => {
    const itemEl = e.target.closest(".item");
    if (!itemEl) return;
    const id = itemEl.dataset.id;

    if (e.target.classList.contains("delete")) {
      state.items = state.items.filter((t) => t.id !== id);
      persistAndRender();
    }
    if (e.target.classList.contains("toggle")) {
      toggleItem(id, e.target.checked);
    }
  });

  // Double-click to edit
  list.addEventListener("dblclick", (e) => {
    const itemEl = e.target.closest(".item");
    if (!itemEl) return;
    if (!e.target.classList.contains("title")) return;
    startEditing(itemEl);
  });

  // Handle edit input commit/cancel
  list.addEventListener("keydown", (e) => {
    if (!e.target.classList.contains("edit")) return;
    if (e.key === "Enter") finishEditing(e.target.closest(".item"), true);
    if (e.key === "Escape") finishEditing(e.target.closest(".item"), false);
  });
  list.addEventListener("blur", (e) => {
    if (e.target.classList.contains("edit")) {
      finishEditing(e.target.closest(".item"), true);
    }
  }, true);

  // --- Drag & drop reorder
  let dragSrc = null;
  list.addEventListener("dragstart", (e) => {
    const li = e.target.closest(".item");
    if (!li) return;
    dragSrc = li;
    li.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });
  list.addEventListener("dragend", (e) => {
    const li = e.target.closest(".item");
    if (li) li.classList.remove("dragging");
    dragSrc = null;
  });
  list.addEventListener("dragover", (e) => {
    e.preventDefault();
    const after = getDragAfterElement(list, e.clientY);
    const dragging = $(".item.dragging");
    if (!dragging) return;
    if (after == null) {
      list.appendChild(dragging);
    } else {
      list.insertBefore(dragging, after);
    }
  });
  list.addEventListener("drop", () => {
    // Rebuild order from DOM
    const newOrder = $$(".item").map((li) => li.dataset.id);
    state.items.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
    persist();
  });

  // ------- Helpers -------
  function getDragAfterElement(container, y) {
    const els = [...container.querySelectorAll(".item:not(.dragging)")];
    return els.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - (box.top + box.height / 2);
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY, element: null }
    ).element;
  }

  function makeItem(title) {
    return { id: crypto.randomUUID(), title, completed: false };
  }

  function toggleItem(id, checked) {
    const t = state.items.find((x) => x.id === id);
    if (t) t.completed = checked ?? !t.completed;
    persistAndRender();
  }

  function startEditing(itemEl) {
    itemEl.classList.add("editing");
    const input = $(".edit", itemEl);
    input.value = $(".title", itemEl).textContent;
    input.focus();
    input.select();
  }

  function finishEditing(itemEl, commit) {
    if (!itemEl.classList.contains("editing")) return;
    const id = itemEl.dataset.id;
    const input = $(".edit", itemEl);
    itemEl.classList.remove("editing");
    if (commit) {
      const v = input.value.trim();
      if (v.length === 0) {
        // Empty -> delete
        state.items = state.items.filter((t) => t.id !== id);
      } else {
        const t = state.items.find((x) => x.id === id);
        if (t) t.title = v;
      }
      persistAndRender();
    } else {
      render(); // cancel
    }
  }

  function saveItemsLeft() {
    const count = state.items.filter((t) => !t.completed).length;
    itemsLeft.textContent = `${count} item${count !== 1 ? "s" : ""} left`;
  }

  function filteredItems() {
    if (state.filter === "active") return state.items.filter((t) => !t.completed);
    if (state.filter === "completed") return state.items.filter((t) => t.completed);
    return state.items;
  }

  function render() {
    list.innerHTML = "";
    const frag = document.createDocumentFragment();
    filteredItems().forEach((t) => {
      const li = template.content.firstElementChild.cloneNode(true);
      li.dataset.id = t.id;
      if (t.completed) li.classList.add("completed");
      $(".title", li).textContent = t.title;
      $(".toggle", li).checked = t.completed;
      frag.appendChild(li);
    });
    list.appendChild(frag);
    saveItemsLeft();
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }
  function persistAndRender() {
    persist();
    render();
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
})();
