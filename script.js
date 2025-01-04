// API URL Configuration
const API_URL = "http://localhost:5000";

window.addEventListener("load", async function () {
  if (window.Clerk) {
    try {
      await window.Clerk.load();

      // Add authentication listener
      window.Clerk.addListener(({ user, status }) => {
        // Handle post-registration flow
        if (
          status === "complete" &&
          !user &&
          sessionStorage.getItem("justRegistered")
        ) {
          sessionStorage.removeItem("justRegistered");
          alert("Registrasi berhasil! Silakan login untuk melanjutkan.");
          window.Clerk.openSignIn({
            afterSignInUrl: "/todo.html",
            redirectUrl: "/todo.html",
          });
          return;
        }

        if (user) {
          // User is authenticated
          if (!window.location.pathname.endsWith("/todo.html")) {
            window.location.href = "/todo.html";
          }
        } else {
          // User is not authenticated
          if (window.location.pathname.endsWith("/todo.html")) {
            window.location.href = "/index.html";
          }
        }
      });

      // Add event listeners for sign-in and sign-up buttons
      const signInButton = document.getElementById("signInButton");
      const signUpButton = document.getElementById("signUpButton");
      const signUpButton2 = document.getElementById("signUpButton2");
      const logoutButton = document.getElementById("logoutButton");
      const demoButton = document.getElementById("demoButton");

      if (signInButton) {
        signInButton.addEventListener("click", () => {
          window.Clerk.openSignIn({
            afterSignInUrl: "/todo.html",
            redirectUrl: "/todo.html",
            appearance: {
              elements: {
                rootBox: {
                  boxShadow: "none",
                },
              },
            },
          });
        });
      }

      const handleSignUp = () => {
        // Set flag before starting registration
        sessionStorage.setItem("justRegistered", "true");

        window.Clerk.openSignUp({
          redirectUrl: "/index.html",
          appearance: {
            elements: {
              rootBox: {
                boxShadow: "none",
              },
            },
          },
          // Configuration for after sign up
          afterSignUpUrl: "/index.html",
          signInUrl: "/index.html",
          // Prevent auto login after sign up
          unsafeMetadata: {
            preventAutoLogin: true,
          },
        });
      };

      if (signUpButton) {
        signUpButton.addEventListener("click", handleSignUp);
      }

      if (signUpButton2) {
        signUpButton2.addEventListener("click", handleSignUp);
      }

      if (demoButton) {
        demoButton.addEventListener("click", () => {
          alert("Demo mode belum tersedia");
        });
      }

      if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
          try {
            await window.Clerk.signOut();
            window.location.href = "/index.html";
          } catch (error) {
            console.error("Error signing out:", error);
            alert("Gagal logout. Silakan coba lagi.");
          }
        });
      }
    } catch (error) {
      console.error("Error initializing Clerk:", error);
      if (!window.location.pathname.endsWith("/todo.html")) {
        alert(
          "Terjadi kesalahan saat memuat sistem autentikasi. Silakan coba lagi nanti."
        );
      }
    }
  }
});

// DOM Elements
let todoForm,
  todoInput,
  todoList,
  todoSummary,
  datePicker,
  dateDisplay,
  prioritySelect;

// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // Only initialize todo functionality if we're on the todo page
  if (window.location.pathname.includes("todo.html")) {
    todoForm = document.getElementById("todoForm");
    todoInput = document.getElementById("todoInput");
    todoList = document.getElementById("todoList");
    todoSummary = document.getElementById("todoSummary");
    datePicker = document.getElementById("datePicker");
    dateDisplay = document.getElementById("dateDisplay");
    prioritySelect = document.getElementById("prioritySelect");

    // Set default date to today
    const today = new Date().toISOString().split("T")[0];
    datePicker.value = today;

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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text,
            date: datePicker.value,
            priority: prioritySelect.value,
          }),
        });

        if (!response.ok) throw new Error("Gagal menambah todo");
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: !todo.completed }),
        });

        if (!response.ok) throw new Error("Gagal mengubah status todo");
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

        if (!response.ok) throw new Error("Gagal menghapus todo");
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
      const completedSummary = todaysTodos.filter(
        (todo) => todo.completed
      ).length;

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
          <span class="todo-priority-badge">${getPriorityText(
            todo.priority
          )}</span>
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

    // Fetch todos when page loads
    fetchTodos(datePicker.value);
  }
});
