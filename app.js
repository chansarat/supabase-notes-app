import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config.js";

const message = document.querySelector("#message");
const authPanel = document.querySelector("#auth-panel");
const notesPanel = document.querySelector("#notes-panel");
const signedInAs = document.querySelector("#signed-in-as");
const noteForm = document.querySelector("#note-form");
const noteTitle = document.querySelector("#note-title");
const noteContent = document.querySelector("#note-content");
const noteFormTitle = document.querySelector("#note-form-title");
const saveNoteButton = document.querySelector("#save-note-button");
const cancelEditButton = document.querySelector("#cancel-edit-button");
const noteList = document.querySelector("#note-list");
const noteCount = document.querySelector("#note-count");
const emptyState = document.querySelector("#empty-state");

let supabase;
let currentUser;
let editingNoteId;

function showMessage(text, kind) {
  message.textContent = text;
  message.dataset.kind = kind || "info";
  message.hidden = false;
}

function clearMessage() {
  message.textContent = "";
  message.hidden = true;
  delete message.dataset.kind;
}

function reportError(error) {
  showMessage(error.message || "Something went wrong. Please try again.", "error");
}

function renderSession(session) {
  currentUser = session?.user ?? null;
  authPanel.hidden = Boolean(currentUser);
  notesPanel.hidden = !currentUser;
  clearMessage();

  if (!currentUser) {
    signedInAs.textContent = "";
    noteList.replaceChildren();
    noteCount.textContent = "";
    emptyState.hidden = true;
    resetNoteForm();
    return;
  }

  signedInAs.textContent = `Signed in as ${currentUser.email}`;
  window.setTimeout(() => {
    loadNotes().catch(reportError);
  }, 0);
}

function resetNoteForm() {
  editingNoteId = undefined;
  noteForm.reset();
  noteFormTitle.textContent = "Write a note";
  saveNoteButton.textContent = "Save note";
  cancelEditButton.hidden = true;
}

function makeNoteCard(note) {
  const card = document.createElement("article");
  card.className = "card note-card";

  const title = document.createElement("h3");
  title.textContent = note.title;
  card.append(title);

  const content = document.createElement("p");
  content.textContent = note.content || "No details added.";
  card.append(content);

  const date = document.createElement("time");
  date.className = "note-date";
  date.dateTime = note.updated_at;
  date.textContent = `Updated ${new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(note.updated_at))}`;
  card.append(date);

  const actions = document.createElement("div");
  actions.className = "note-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "button-secondary";
  editButton.textContent = "Edit";
  editButton.addEventListener("click", () => {
    editingNoteId = note.id;
    noteTitle.value = note.title;
    noteContent.value = note.content;
    noteFormTitle.textContent = "Edit note";
    saveNoteButton.textContent = "Save changes";
    cancelEditButton.hidden = false;
    noteTitle.focus();
    noteForm.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  actions.append(editButton);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-button";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => {
    deleteNote(note.id).catch(reportError);
  });
  actions.append(deleteButton);
  card.append(actions);

  return card;
}

async function loadNotes() {
  if (!currentUser) return;

  const { data, error } = await supabase
    .from("notes")
    .select("id, title, content, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  noteList.replaceChildren(...data.map(makeNoteCard));
  noteCount.textContent = `${data.length} ${data.length === 1 ? "note" : "notes"}`;
  emptyState.hidden = data.length > 0;
}

async function deleteNote(noteId) {
  const confirmed = window.confirm("Delete this note? This cannot be undone.");
  if (!confirmed) return;

  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) throw error;

  if (editingNoteId === noteId) resetNoteForm();
  showMessage("Note deleted.", "info");
  await loadNotes();
}

document.querySelector("#signup-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();
  const form = new FormData(event.currentTarget);

  try {
    const { data, error } = await supabase.auth.signUp({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (error) throw error;
    if (data.session) {
      showMessage("Account created. You’re signed in.", "info");
    } else {
      showMessage("Account created. Check your email to confirm it, then log in.", "info");
    }
  } catch (error) {
    reportError(error);
  }
});

document.querySelector("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();
  const form = new FormData(event.currentTarget);

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (error) throw error;
  } catch (error) {
    reportError(error);
  }
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  clearMessage();
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    reportError(error);
  }
});

noteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  const isEditing = Boolean(editingNoteId);
  const note = {
    title: noteTitle.value.trim(),
    content: noteContent.value,
  };
  if (!note.title) {
    showMessage("Please add a title before saving.", "error");
    noteTitle.focus();
    return;
  }

  try {
    const query = editingNoteId
      ? supabase.from("notes").update(note).eq("id", editingNoteId)
      : supabase.from("notes").insert({ ...note, user_id: currentUser.id });
    const { error } = await query;
    if (error) throw error;

    resetNoteForm();
    showMessage(isEditing ? "Note updated." : "Note saved.", "info");
    await loadNotes();
  } catch (error) {
    reportError(error);
  }
});

cancelEditButton.addEventListener("click", resetNoteForm);

async function initialize() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    showMessage("Add your Supabase project URL and publishable key to config.js to get started.", "error");
    document.querySelectorAll("#signup-form button, #login-form button").forEach((button) => {
      button.disabled = true;
    });
    return;
  }

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    supabase.auth.onAuthStateChange((_event, session) => renderSession(session));

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    renderSession(data.session);
  } catch (error) {
    reportError(error);
  }
}

initialize();
