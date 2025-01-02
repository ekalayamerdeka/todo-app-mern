require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection error:"));
db.once("open", () => console.log("Connected to MongoDB"));

// Schema and model
const todoSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "Todo text is required"],
      trim: true,
      minLength: [1, "Todo text cannot be empty"],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    date: {
      type: String,
      required: [true, "Date is required"],
      validate: {
        validator: function (v) {
          return /^\d{4}-\d{2}-\d{2}$/.test(v);
        },
        message: (props) =>
          `${props.value} is not a valid date format! Use YYYY-MM-DD`,
      },
    },
    priority: {
      type: String,
      required: [true, "Priority is required"],
      enum: {
        values: ["high", "medium", "low"],
        message: "{VALUE} is not a valid priority level",
      },
    },
  },
  {
    timestamps: true,
  }
);

const Todo = mongoose.model("Todo", todoSchema);

// Helper function for priority sorting
const prioritySort = (todos) => {
  const priorityOrder = { high: 1, medium: 2, low: 3 };
  return todos.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );
};

// Routes

// Get todos
app.get("/todos", async (req, res) => {
  try {
    let query = {};

    if (req.query.date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
        return res.status(400).json({
          error: "Invalid date format. Please use YYYY-MM-DD",
        });
      }
      query.date = req.query.date;
    }

    const todos = await Todo.find(query).lean();
    const sortedTodos = prioritySort(todos);
    res.json(sortedTodos);
  } catch (err) {
    console.error("Error fetching todos:", err);
    res.status(500).json({
      error: "An error occurred while fetching todos",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// Add new todo
app.post("/todos", async (req, res) => {
  try {
    const { text, date, priority } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ error: "Todo text is required" });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: "Invalid date format. Please use YYYY-MM-DD",
      });
    }

    if (
      !priority ||
      !["high", "medium", "low"].includes(priority.toLowerCase())
    ) {
      return res.status(400).json({
        error: "Priority must be either 'high', 'medium', or 'low'",
      });
    }

    const newTodo = new Todo({
      text: text.trim(),
      date,
      priority: priority.toLowerCase(),
    });

    await newTodo.save();
    res.status(201).json(newTodo);
  } catch (err) {
    console.error("Error creating todo:", err);
    res.status(400).json({
      error: "Failed to create todo",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// Update todo status
app.put("/todos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid todo ID" });
    }

    if (typeof completed !== "boolean") {
      return res.status(400).json({
        error: "Completed status must be a boolean",
      });
    }

    const todo = await Todo.findByIdAndUpdate(
      id,
      { completed },
      { new: true, runValidators: true }
    );

    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }

    res.json(todo);
  } catch (err) {
    console.error("Error updating todo:", err);
    res.status(400).json({
      error: "Failed to update todo",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// Delete todo
app.delete("/todos/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid todo ID" });
    }

    const todo = await Todo.findByIdAndDelete(id);

    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }

    res.json({ message: "Todo deleted successfully", todo });
  } catch (err) {
    console.error("Error deleting todo:", err);
    res.status(400).json({
      error: "Failed to delete todo",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something broke!",
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start Server
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
