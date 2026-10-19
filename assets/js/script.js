let tasksByDate = {};
let filter = "all";
let activeFocusId = null;       
let focusCompletedCount = 0;   
let lastRenderedMinute = new Date().getMinutes();
let editingTaskId = null;
let deletingTaskId = null;

const now = new Date();
let selectedDate = dateKey(now);
let viewYear = now.getFullYear();
let viewMonth = now.getMonth();

const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const summary = document.getElementById("summary");
const progress = document.getElementById("progress");
const calTitle = document.getElementById("calTitle");
const calGrid = document.getElementById("calGrid");
const dateLabel = document.getElementById("dateLabel");
const themeBtn = document.getElementById("themeBtn");
const taskTime = document.getElementById("taskTime");
const taskCategory = document.getElementById("taskCategory");
const taskNote = document.getElementById("taskNote");
const clock = document.getElementById("clock");
const greeting = document.getElementById("greeting");

const homeView = document.getElementById("homeView");
const focusView = document.getElementById("focusView");
const navHomeBtn = document.getElementById("navHomeBtn");
const navFocusBtn = document.getElementById("navFocusBtn");
const focusTaskNameElem = document.getElementById("focusTaskName");
const focusSessionsText = document.getElementById("focusSessionsText");

const editModal = new bootstrap.Modal(document.getElementById("editModal"));
const deleteModal = new bootstrap.Modal(document.getElementById("deleteModal"));
const messageModal = new bootstrap.Modal(document.getElementById("messageModal"));
const editText = document.getElementById("editText");
const editNote = document.getElementById("editNote");
const messageText = document.getElementById("messageText");

const POMO_MINUTES = { work: 25, shortBreak: 5, longBreak: 15 };
let pomoTimer = null;
let pomoEndTime = 0;           
let pomoTimeLeft = POMO_MINUTES.work * 60;
let pomoIsRunning = false;
let pomoMode = "work";
const pomoDisplay = document.getElementById("pomoDisplay");
const pomoStartBtn = document.getElementById("pomoStartBtn");

function dateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return date.getFullYear() + "-" + month + "-" + day;
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function getTasks() {
  if (!tasksByDate[selectedDate]) tasksByDate[selectedDate] = [];
  return tasksByDate[selectedDate];
}

function findTaskById(id) {
  if (id === null) return null;
  for (const key in tasksByDate) {
    const found = tasksByDate[key].find(t => t.id === id);
    if (found) return found;
  }
  return null;
}

function save() {
  for (const key in tasksByDate) {
    if (tasksByDate[key].length === 0) delete tasksByDate[key];
  }
  try { localStorage.setItem("todoData", JSON.stringify(tasksByDate)); } catch (e) { }
}

function load() {
  try {
    const data = localStorage.getItem("todoData");
    if (data) tasksByDate = JSON.parse(data);
  } catch (e) { }
}

function saveFocusCount() {
  try {
    localStorage.setItem("todoFocus", JSON.stringify({ date: dateKey(new Date()), count: focusCompletedCount }));
  } catch (e) { }
}

function loadFocusCount() {
  try {
    const data = JSON.parse(localStorage.getItem("todoFocus"));
    if (data && data.date === dateKey(new Date())) focusCompletedCount = data.count;
  } catch (e) { }
}

function formatTime(time) {
  if (!time) return "";
  const parts = time.split(":");
  const hour = Number(parts[0]);
  const suffix = hour >= 12 ? "PM" : "AM";
  return (hour % 12 || 12) + ":" + parts[1] + " " + suffix;
}

function isOverdue(taskTimeStr) {
  if (!taskTimeStr) return false;
  const todayStr = dateKey(new Date());
  if (selectedDate !== todayStr) return selectedDate < todayStr;

  const currentTime = new Date();
  const [tHour, tMinute] = taskTimeStr.split(":").map(Number);
  if (tHour < currentTime.getHours()) return true;
  return tHour === currentTime.getHours() && tMinute < currentTime.getMinutes();
}

function updateClock() {
  const date = new Date();
  clock.textContent = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const hour = date.getHours();
  let text = "Good evening";
  if (hour < 12) text = "Good morning";
  else if (hour < 18) text = "Good afternoon";
  greeting.textContent = text + "!";

  if (date.getMinutes() !== lastRenderedMinute) {
    lastRenderedMinute = date.getMinutes();
    render();
  }
}

function showMessage(text) {
  messageText.textContent = text;
  messageModal.show();
}

function launchConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#cb91e6", "#4a046b", "#e5484d", "#43aa8b", "#f9844a"];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 0.5 + "s";
    piece.style.animationDuration = 1.5 + Math.random() * 1.5 + "s";
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 3500);
  }
}

function switchView(view) {
  if (view === "home") {
    homeView.style.display = "block";
    focusView.style.display = "none";
    navHomeBtn.classList.add("active");
    navFocusBtn.classList.remove("active");
  } else {
    homeView.style.display = "none";
    focusView.style.display = "block";
    navHomeBtn.classList.remove("active");
    navFocusBtn.classList.add("active");
    updateFocusTaskDisplay();
  }
}

function startFocusOnTask(id) {
  activeFocusId = id;
  updateFocusTaskDisplay();
  switchView("focus");
}

function updateFocusTaskDisplay() {
  const task = findTaskById(activeFocusId);
  focusTaskNameElem.textContent = task ? task.text : "No task selected";
  focusSessionsText.textContent = "Focus: " + focusCompletedCount + " / 4";
}

function setTheme(name) {
  document.documentElement.setAttribute("data-bs-theme", name);
  themeBtn.textContent = name === "dark" ? "Light mode" : "Dark mode";
  try { localStorage.setItem("todoTheme", name); } catch (e) { }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-bs-theme");
  setTheme(current === "dark" ? "light" : "dark");
}

function addTask() {
  const text = taskInput.value.trim();
  if (text === "") {
    taskInput.classList.add("is-invalid");
    return;
  }
  taskInput.classList.remove("is-invalid");

  const newTask = {
    id: Date.now(),
    text: text,
    completed: false,
    time: taskTime.value,
    category: taskCategory.value,
    note: taskNote.value.trim()
  };

  getTasks().push(newTask);

  if (activeFocusId === null) activeFocusId = newTask.id;

  taskTime.value = "";
  taskNote.value = "";
  taskInput.value = "";
  save();
  render();
}

function toggleTask(id) {
  const task = getTasks().find(t => t.id === id);
  task.completed = !task.completed;

  if (task.completed && activeFocusId === id) {
    activeFocusId = null;
  }

  if (task.completed && getTasks().every(t => t.completed)) {
    launchConfetti();
  }

  save();
  render();
}

function editTask(id) {
  const task = getTasks().find(t => t.id === id);
  editingTaskId = id;
  editText.value = task.text;
  editNote.value = task.note || "";
  editText.classList.remove("is-invalid");
  editModal.show();
}

function saveEdit() {
  const newText = editText.value.trim();
  if (newText === "") {
    editText.classList.add("is-invalid");
    return;
  }
  const task = getTasks().find(t => t.id === editingTaskId);
  task.text = newText;
  task.note = editNote.value.trim();
  editModal.hide();
  save();
  render();
}

function deleteTask(id) {
  deletingTaskId = id;
  deleteModal.show();
}

function confirmDelete() {
  if (activeFocusId === deletingTaskId) activeFocusId = null;
  tasksByDate[selectedDate] = getTasks().filter(t => t.id !== deletingTaskId);
  deletingTaskId = null;
  save();
  render();
  deleteModal.hide();
}

function setFilter(name, button) {
  filter = name;
  document.querySelectorAll(".filter button").forEach(b => b.classList.remove("active"));
  button.classList.add("active");
  render();
}

function updatePomoDisplay() {
  const minutes = Math.floor(pomoTimeLeft / 60);
  const seconds = pomoTimeLeft % 60;
  pomoDisplay.textContent = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

function setPomoMode(mode) {
  pausePomodoro();
  pomoMode = mode;
  document.querySelectorAll(".pomo-tab").forEach(b => {
    b.classList.toggle("active", b.dataset.mode === mode);
  });
  pomoTimeLeft = POMO_MINUTES[mode] * 60;
  updatePomoDisplay();
}

function togglePomodoro() {
  if (pomoIsRunning) pausePomodoro();
  else startPomodoro();
}

function startPomodoro() {
  pomoIsRunning = true;
  pomoStartBtn.innerHTML = '<i class="bi bi-pause-fill me-1"></i> Pause';
  pomoEndTime = Date.now() + pomoTimeLeft * 1000;
  pomoTimer = setInterval(tickPomodoro, 250);
}

function tickPomodoro() {
  pomoTimeLeft = Math.max(0, Math.round((pomoEndTime - Date.now()) / 1000));
  updatePomoDisplay();
  if (pomoTimeLeft === 0) finishPomodoro();
}

function finishPomodoro() {
  const finishedMode = pomoMode;
  pausePomodoro();

  if (finishedMode === "work") {
    focusCompletedCount++;
    saveFocusCount();
    updateFocusTaskDisplay();
    if (focusCompletedCount >= 4) {
      setPomoMode("longBreak");
      showMessage("4 focus sessions done! Time for a long break.");
    } else {
      setPomoMode("shortBreak");
      showMessage("Focus session complete! Time for a short break.");
    }
  } else {
    if (finishedMode === "longBreak") {
      focusCompletedCount = 0;
      saveFocusCount();
      updateFocusTaskDisplay();
    }
    setPomoMode("work");
    showMessage("Break is over. Ready to focus again?");
  }
}

function pausePomodoro() {
  if (pomoIsRunning) {
    pomoTimeLeft = Math.max(0, Math.round((pomoEndTime - Date.now()) / 1000));
  }
  pomoIsRunning = false;
  clearInterval(pomoTimer);
  pomoStartBtn.innerHTML = '<i class="bi bi-play-fill me-1"></i> Start';
  updatePomoDisplay();
}

function resetPomodoro() {
  pausePomodoro();
  pomoTimeLeft = POMO_MINUTES[pomoMode] * 60;
  updatePomoDisplay();
}

function changeMonth(step) {
  viewMonth += step;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  render();
}

function selectDate(key) {
  selectedDate = key;
  render();
}

function goToday() {
  const today = new Date();
  selectedDate = dateKey(today);
  viewYear = today.getFullYear();
  viewMonth = today.getMonth();
  render();
}

function renderCalendar() {
  const firstDay = new Date(viewYear, viewMonth, 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayKey = dateKey(new Date());

  calTitle.textContent = firstDay.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  let html = "";
  for (const name of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
    html += `<div class="cal-weekday">${name}</div>`;
  }
  for (let i = 0; i < offset; i++) {
    html += "<div></div>";
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const key = dateKey(new Date(viewYear, viewMonth, day));
    let classes = "cal-day";
    if (key === todayKey) classes += " today";
    if (key === selectedDate) classes += " selected";
    if (tasksByDate[key] && tasksByDate[key].length > 0) classes += " has-tasks";
    html += `<button class="${classes}" onclick="selectDate('${key}')">${day}</button>`;
  }
  calGrid.innerHTML = html;
}

function render() {
  renderCalendar();

  const dateText = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
  dateLabel.textContent = "Tasks for " + dateText;

  const tasks = getTasks();
  let visibleTasks = tasks;
  if (filter === "active") visibleTasks = tasks.filter(t => !t.completed);
  if (filter === "completed") visibleTasks = tasks.filter(t => t.completed);

  visibleTasks = [...visibleTasks].sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

  let html = "";
  for (const task of visibleTasks) {
    const playButtonHtml = !task.completed
      ? `<button class="btn-small play" onclick="startFocusOnTask(${task.id})" title="Start in Focus Mode" aria-label="Start in Focus Mode"><i class="bi bi-play-fill"></i></button>`
      : "";

    const overdueClass = (!task.completed && isOverdue(task.time)) ? "overdue" : "";

    html += `
      <li class="task ${task.completed ? "completed-task" : ""}">
        <input type="checkbox" class="form-check-input" ${task.completed ? "checked" : ""} onchange="toggleTask(${task.id})" aria-label="Mark as completed">
        <div class="task-main">
          <span class="task-text ${task.completed ? "completed" : ""}">${escapeHtml(task.text)}</span>
          ${task.note ? `<span class="task-note">${escapeHtml(task.note)}</span>` : ""}
          ${task.category ? `<span class="cat cat-${task.category}">${task.category}</span>` : ""}
        </div>
        <span class="task-time ${overdueClass}">${formatTime(task.time)}</span>
        ${playButtonHtml}
        <button class="btn-small" onclick="editTask(${task.id})" title="Edit" aria-label="Edit task"><i class="bi bi-pencil"></i></button>
        <button class="btn-small delete" onclick="deleteTask(${task.id})" title="Delete" aria-label="Delete task"><i class="bi bi-trash"></i></button>
      </li>`;
  }
  if (html === "") {
    html = '<li class="empty">No tasks here</li>';
  }
  taskList.innerHTML = html;

  updateFocusTaskDisplay();

  const completedCount = tasks.filter(t => t.completed).length;
  if (tasks.length === 0) {
    summary.textContent = "No tasks yet";
    progress.style.width = "0%";
  } else {
    summary.textContent = completedCount + " of " + tasks.length + " tasks completed";
    progress.style.width = (completedCount / tasks.length) * 100 + "%";
  }
}

taskInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") addTask();
});

editText.addEventListener("keydown", function (e) {
  if (e.key === "Enter") saveEdit();
});

let savedTheme = "light";
try { savedTheme = localStorage.getItem("todoTheme") || "light"; } catch (e) { }
setTheme(savedTheme);
load();
loadFocusCount();
updateClock();
setInterval(updateClock, 1000);
updatePomoDisplay();
render();
