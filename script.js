// API URL Configuration
const API_URL = "http://localhost:5000";

// DOM Elements
const todoForm = document.getElementById("todoForm");
const todoInput = document.getElementById("todoInput");
const todoList = document.getElementById("todoList");
const todoSummary = document.getElementById("todoSummary");
const datePicker = document.getElementById("datePicker");
const dateDisplay = document.getElementById("dateDisplay");
const prioritySelect = document.getElementById("prioritySelect");

// Set default date to today
const today = new Date();
datePicker.value = today.toISOString().split("T")[0];

// Initialize todos array
let todos = [];

// Date formatting functions
function formatDate(date) {
  const options = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  return new Date(date).toLocaleDateString("id-ID", options);
}

function formatShortDate(date) {
  const options = { day: "numeric", month: "short", year: "numeric" };
  return new Date(date).toLocaleDateString("id-ID", options);
}

// Priority text helper function
function getPriorityText(priority) {
  switch (priority) {
    case "high":
      return "Prioritas Tinggi";
    case "medium":
      return "Prioritas Sedang";
    case "low":
      return "Prioritas Rendah";
    default:
      return "";
  }
}

// API Functions
async function fetchTodos(date) {
  try {
    const response = await fetch(`${API_URL}/todos?date=${date}`);
    const data = await response.json();
    todos = data;
    updateTodoList();
  } catch (error) {
    console.error("Error:", error);
    alert("Gagal mengambil data todos");
  }
}

async function addTodo(text) {
  try {
    const response = await fetch(`${API_URL}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
        date: datePicker.value,
        priority: prioritySelect.value,
      }),
    });

    if (!response.ok) {
      throw new Error("Gagal menambah todo");
    }

    const newTodo = await response.json();
    todos.push(newTodo);
    todoList.appendChild(createTodoElement(newTodo));
    updateSummary();
  } catch (error) {
    console.error("Error:", error);
    alert("Gagal menambah todo");
  }
}

async function toggleTodo(id) {
  try {
    const todo = todos.find((todo) => todo._id === id);
    if (!todo) return;

    const response = await fetch(`${API_URL}/todos/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        completed: !todo.completed,
      }),
    });

    if (!response.ok) {
      throw new Error("Gagal mengubah status todo");
    }

    const updatedTodo = await response.json();
    const todoIndex = todos.findIndex((t) => t._id === id);
    todos[todoIndex] = updatedTodo;

    const todoElement = todoList.querySelector(
      `[data-id="${id}"]`
    ).parentElement;
    todoElement.className = `todo-item ${
      updatedTodo.completed ? "completed" : ""
    } priority-${updatedTodo.priority}`;
    const checkbox = todoElement.querySelector(".todo-checkbox");
    checkbox.className = `todo-checkbox ${
      updatedTodo.completed ? "checked" : ""
    }`;
    checkbox.innerHTML = updatedTodo.completed ? "✓" : "";

    updateSummary();
  } catch (error) {
    console.error("Error:", error);
    alert("Gagal mengubah status todo");
  }
}

async function deleteTodo(id) {
  try {
    const response = await fetch(`${API_URL}/todos/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Gagal menghapus todo");
    }

    const todoIndex = todos.findIndex((todo) => todo._id === id);
    if (todoIndex !== -1) {
      todos.splice(todoIndex, 1);
      const todoElement = todoList
        .querySelector(`[data-id="${id}"]`)
        .closest(".todo-item");
      todoElement.remove();
      updateSummary();
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Gagal menghapus todo");
  }
}

// UI Functions
function updateSummary() {
  const selectedDate = datePicker.value;
  const todaysTodos = todos.filter((todo) => todo.date === selectedDate);
  const totalSummary = todaysTodos.length;
  const completedSummary = todaysTodos.filter((todo) => todo.completed).length;

  todoSummary.textContent = `Selesai: ${completedSummary} dari ${totalSummary} tugas untuk hari ini`;
}

function createTodoElement(todo) {
  const todoItem = document.createElement("div");
  todoItem.className = `todo-item ${
    todo.completed ? "completed" : ""
  } priority-${todo.priority}`;

  todoItem.innerHTML = `
    <div class="todo-content">
      <button class="todo-checkbox ${
        todo.completed ? "checked" : ""
      }" data-id="${todo._id}">
        ${todo.completed ? "✓" : ""}
      </button>
      <span class="todo-priority-badge">${getPriorityText(todo.priority)}</span>
      <span class="todo-text">${todo.text}</span>
      <span class="todo-date">${formatShortDate(todo.date)}</span>
      <button class="delete-button" data-id="${todo._id}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"></path>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `;
  return todoItem;
}

function updateTodoList() {
  const selectedDate = datePicker.value;
  dateDisplay.textContent = `Tugas untuk ${formatDate(selectedDate)}`;
  todoList.innerHTML = "";

  // Sort todos by priority
  const priorityOrder = { high: 1, medium: 2, low: 3 };
  const sortedTodos = todos
    .filter((todo) => todo.date === selectedDate)
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  sortedTodos.forEach((todo) => {
    todoList.appendChild(createTodoElement(todo));
  });

  updateSummary();
}

// Event Listeners
todoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = todoInput.value.trim();
  if (text) {
    await addTodo(text);
    todoInput.value = "";
  }
});

todoList.addEventListener("click", async (e) => {
  const id = e.target.dataset.id || e.target.parentElement.dataset.id;
  if (!id) return;

  if (
    e.target.classList.contains("delete-button") ||
    e.target.closest(".delete-button")
  ) {
    await deleteTodo(id);
  } else if (e.target.classList.contains("todo-checkbox")) {
    await toggleTodo(id);
  }
});

datePicker.addEventListener("change", () => {
  fetchTodos(datePicker.value);
});

// Initialize todos when page loads
document.addEventListener("DOMContentLoaded", () => {
  fetchTodos(datePicker.value);
});
