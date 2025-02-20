    // Global Variables and Settings
    let tasks = [];
    let currentFilter = 'all';
    let searchQuery = '';
    let settings = { theme: 'light' };

    // DOM Elements
    const taskList = document.getElementById("taskList");
    const taskInput = document.getElementById("taskInput");
    const tagInput = document.getElementById("tagInput");
    const ratingInput = document.getElementById("ratingInput");
    const dueDateInput = document.getElementById("dueDateInput");
    const addTaskBtn = document.getElementById("addTaskBtn");
    const addTodayTaskBtn = document.getElementById("addTodayTaskBtn");
    const filterButtons = document.querySelectorAll(".filter-btn");
    const clearCompletedBtn = document.getElementById("clearCompletedBtn");
    const clearAllBtn = document.getElementById("clearAllBtn");
    const exportTasksBtn = document.getElementById("exportTasksBtn");
    const searchInput = document.getElementById("searchInput");
    const currentDateEl = document.getElementById("currentDate");
    const modeToggleBtn = document.getElementById("modeToggleBtn");
    const progressBar = document.getElementById("progressBar");
    const taskCountEl = document.getElementById("taskCount");
    const streakCountEl = document.getElementById("streakCount");
    let ratingChart, completionChart, streakChart;

    // Audio Elements for sound effects
    const completionSound = document.getElementById("completionSound");
    const deleteSound = document.getElementById("deleteSound");
    const achievementSound = document.getElementById("achievementSound");
    const newTaskSound = document.getElementById("newTaskSound");
    completionSound.volume = 0.7;
    deleteSound.volume = 0.7;
    achievementSound.volume = 0.7;
    newTaskSound.volume = 0.7;

    // Toast Notification Function
    function showToast(message, duration = 3000) {
      const toastContainer = document.getElementById("toastContainer");
      const toast = document.createElement("div");
      toast.className = "toast";
      toast.textContent = message;
      toastContainer.appendChild(toast);
      setTimeout(() => { toast.remove(); }, duration);
    }

    // Load tasks and settings from localStorage
    function loadData() {
      const storedTasks = localStorage.getItem("tasks");
      if (storedTasks) { tasks = JSON.parse(storedTasks); }
      const storedSettings = localStorage.getItem("settings");
      if (storedSettings) {
        const savedSettings = JSON.parse(storedSettings);
        settings.theme = savedSettings.theme || 'light';
      }
      applySettings();
    }
    function saveData() {
      localStorage.setItem("tasks", JSON.stringify(tasks));
      localStorage.setItem("settings", JSON.stringify(settings));
    }

    // Apply dark/light mode
    function applySettings() {
      if (settings.theme === "dark") {
        document.body.classList.add("dark-mode");
        modeToggleBtn.textContent = "Light Mode";
      } else {
        document.body.classList.remove("dark-mode");
        modeToggleBtn.textContent = "Dark Mode";
      }
    }

    // Update current date display
    function updateCurrentDate() {
      const today = new Date();
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      currentDateEl.textContent = today.toLocaleDateString(undefined, options);
    }
    updateCurrentDate();
    loadData();

    // Utility to check if task is overdue
    function isOverdue(task) {
      if (!task.dueDate) return false;
      const due = new Date(task.dueDate);
      const today = new Date();
      today.setHours(0,0,0,0);
      return due < today && !task.completed;
    }

    // Update progress bar and task count
    function updateProgress() {
      const total = tasks.length;
      const completed = tasks.filter(task => task.completed).length;
      const percent = total ? (completed / total) * 100 : 0;
      progressBar.style.width = percent + "%";
      if (total === 0) {
        taskCountEl.textContent = "";
      } else if (completed === total) {
        taskCountEl.textContent = "All tasks completed! Great job!";
      } else {
        taskCountEl.textContent = (total - completed) + " tasks remaining.";
      }
    }

    // Compute current streak (consecutive days with at least one completion)
    function computeCurrentStreak() {
      let streak = 0;
      let date = new Date();
      while (true) {
        const dateStr = date.toISOString().split("T")[0];
        const completedOnDate = tasks.some(task => task.completed && task.completedDate === dateStr);
        if (completedOnDate) { streak++; date.setDate(date.getDate() - 1); }
        else { break; }
      }
      return streak;
    }

    // Update streak counter display
    function updateStreakCount() {
      const streak = computeCurrentStreak();
      streakCountEl.textContent = "Current Streak: " + streak + " day" + (streak === 1 ? "" : "s");
    }

    // Get last n dates as an array (YYYY-MM-DD)
    function getLastNDates(n) {
      const dates = [];
      const today = new Date();
      for (let i = n - 1; i >= 0; i--) {
        let d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split("T")[0]);
      }
      return dates;
    }

    // Update Streak Chart (Daily Completions over last 7 days)
    function updateStreakChart() {
      const last7 = getLastNDates(7);
      const counts = last7.map(date =>
        tasks.filter(task => task.completed && task.completedDate === date).length
      );
      if (streakChart) {
        streakChart.data.labels = last7;
        streakChart.data.datasets[0].data = counts;
        streakChart.update();
      } else {
        const ctx = document.getElementById("streakChart").getContext("2d");
        streakChart = new Chart(ctx, {
          type: "line",
          data: {
            labels: last7,
            datasets: [{
              label: "Tasks Completed",
              data: counts,
              fill: true,
              backgroundColor: "rgba(0,198,255,0.3)",
              borderColor: "rgba(0,114,255,1)",
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6
            }]
          },
          options: {
            responsive: true,
            animation: { easing: 'easeOutQuart', duration: 1000 },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                titleFont: { size: 14 },
                bodyFont: { size: 12 },
                borderColor: 'rgba(0,0,0,0.1)',
                borderWidth: 1
              }
            },
            scales: {
              y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.1)' } },
              x: { grid: { display: false } }
            }
          }
        });
      }
    }

    // Update all charts and counters
    function updateCharts() {
      updateRatingChart();
      updateCompletionChart();
      updateStreakChart();
      updateProgress();
      updateStreakCount();
    }

    // Rating Chart
    function updateRatingChart() {
      const ratingCounts = [0, 0, 0, 0, 0];
      tasks.forEach(task => { ratingCounts[task.rating - 1]++; });
      if (ratingChart) {
        ratingChart.data.datasets[0].data = ratingCounts;
        ratingChart.update();
      } else {
        const ctx = document.getElementById("ratingChart").getContext("2d");
        ratingChart = new Chart(ctx, {
          type: "bar",
          data: {
            labels: ["1", "2", "3", "4", "5"],
            datasets: [{
              label: "Task Rating Count",
              data: ratingCounts,
              backgroundColor: [
                "rgba(255, 99, 132, 0.7)",
                "rgba(54, 162, 235, 0.7)",
                "rgba(255, 206, 86, 0.7)",
                "rgba(75, 192, 192, 0.7)",
                "rgba(153, 102, 255, 0.7)"
              ],
              borderColor: [
                "rgba(255, 99, 132, 1)",
                "rgba(54, 162, 235, 1)",
                "rgba(255, 206, 86, 1)",
                "rgba(75, 192, 192, 1)",
                "rgba(153, 102, 255, 1)"
              ],
              borderWidth: 1,
              borderRadius: 4,
              barPercentage: 0.6
            }]
          },
          options: {
            responsive: true,
            animation: { easing: 'easeOutQuart', duration: 1000 },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                titleFont: { size: 14 },
                bodyFont: { size: 12 },
                borderColor: 'rgba(0,0,0,0.1)',
                borderWidth: 1
              }
            },
            scales: {
              y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.1)' } },
              x: { grid: { display: false } }
            }
          }
        });
      }
    }

    // Completion Chart (Active vs. Completed Tasks)
    function updateCompletionChart() {
      const activeCount = tasks.filter(task => !task.completed).length;
      const completedCount = tasks.filter(task => task.completed).length;
      if (completionChart) {
        completionChart.data.datasets[0].data = [activeCount, completedCount];
        completionChart.update();
      } else {
        const ctx = document.getElementById("completionChart").getContext("2d");
        completionChart = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: ["Active", "Completed"],
            datasets: [{
              data: [activeCount, completedCount],
              backgroundColor: [
                "rgba(54, 162, 235, 0.7)",
                "rgba(75, 192, 192, 0.7)"
              ],
              borderColor: [
                "rgba(54, 162, 235, 1)",
                "rgba(75, 192, 192, 1)"
              ],
              borderWidth: 1,
              cutout: "70%"
            }]
          },
          options: {
            responsive: true,
            animation: { easing: 'easeOutQuart', duration: 1000 },
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                titleFont: { size: 14 },
                bodyFont: { size: 12 },
                borderColor: 'rgba(0,0,0,0.1)',
                borderWidth: 1
              }
            }
          }
        });
      }
    }

    // Render Tasks List
    function renderTasks() {
      taskList.innerHTML = "";
      const todayDate = new Date().toISOString().split("T")[0];
      const filteredTasks = tasks.filter(task => {
        if (currentFilter === "active" && task.completed) return false;
        if (currentFilter === "completed" && !task.completed) return false;
        if (currentFilter === "today" && task.dueDate !== todayDate) return false;
        if (searchQuery && !task.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      });
      filteredTasks.forEach((task, idx) => {
        const li = document.createElement("li");
        li.className = "task-item fade-in";
        li.innerHTML = `
          <div class="task-left">
            <input type="checkbox" class="complete-checkbox" data-index="${idx}" ${task.completed ? "checked" : ""}>
            <div>
              <span class="task-text ${task.completed ? "completed" : ""}">${task.text}</span>
              ${task.tag ? `<span class="task-tag">(Tag: ${task.tag})</span>` : ""}
              <div class="task-details">
                <span>(Rating: ${task.rating})</span>
                ${task.dueDate ? `<span class="${isOverdue(task) ? "overdue" : ""}"> - Due: ${task.dueDate}</span>` : ""}
              </div>
              ${task.subtasks && task.subtasks.length ? `<ul class="subtask-list">
                ${task.subtasks.map((sub, subIndex) => `
                  <li class="subtask-item ${sub.completed ? "completed" : ""}">
                    <input type="checkbox" class="subtask-checkbox" data-task-index="${idx}" data-subtask-index="${subIndex}" ${sub.completed ? "checked" : ""}>
                    <span>${sub.text}</span>
                  </li>`).join("")}
              </ul>` : ""}
            </div>
          </div>
          <div class="task-actions">
            <button class="btn edit-btn" data-index="${idx}">Edit</button>
            <button class="btn delete-btn" data-index="${idx}">Delete</button>
            <button class="btn add-subtask-btn" data-index="${idx}">Add Subtask</button>
          </div>
        `;
        taskList.appendChild(li);
      });
      updateProgress();
    }

    // Event: Add Task (normal)
    addTaskBtn.addEventListener("click", () => {
      const text = taskInput.value.trim();
      const tag = tagInput.value.trim();
      const rating = parseInt(ratingInput.value);
      const dueDate = dueDateInput.value;
      if (!text) { showToast("Please enter a task."); return; }
      tasks.push({ text, tag, rating, dueDate, completed: false, completedDate: null, subtasks: [] });
      saveData();
      taskInput.value = ""; tagInput.value = ""; ratingInput.value = "3"; dueDateInput.value = "";
      renderTasks(); updateCharts();
      newTaskSound.play();
      showToast("Task added!");
    });

    // Event: Add Today's Task (auto-set due date)
    addTodayTaskBtn.addEventListener("click", () => {
      const text = taskInput.value.trim();
      const tag = tagInput.value.trim();
      const rating = parseInt(ratingInput.value);
      if (!text) { showToast("Please enter a task."); return; }
      const today = new Date().toISOString().split("T")[0];
      tasks.push({ text, tag, rating, dueDate: today, completed: false, completedDate: null, subtasks: [] });
      saveData();
      taskInput.value = ""; tagInput.value = ""; ratingInput.value = "3"; dueDateInput.value = "";
      renderTasks(); updateCharts();
      newTaskSound.play();
      showToast("Today's task added!");
    });

    // Filter Buttons Event
    filterButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        filterButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.getAttribute("data-filter");
        renderTasks();
      });
    });

    // Event: Clear Completed Tasks
    clearCompletedBtn.addEventListener("click", () => {
      tasks = tasks.filter(task => !task.completed);
      saveData(); renderTasks(); updateCharts();
      showToast("Completed tasks cleared!");
    });

    // Event: Export Tasks as CSV
    exportTasksBtn.addEventListener("click", () => {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Task,Tag,Rating,Due Date,Completed,Completed Date\n";
      tasks.forEach(task => {
        const row = [
          `"${task.text.replace(/"/g, '""')}"`,
          task.tag || "",
          task.rating,
          task.dueDate || "",
          task.completed,
          task.completedDate || ""
        ].join(",");
        csvContent += row + "\n";
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "tasks.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    // Event: Clear All Tasks
    clearAllBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to delete all tasks?")) {
        tasks = [];
        saveData(); renderTasks(); updateCharts();
        showToast("All tasks cleared!");
      }
    });

    // Event: Search Tasks
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderTasks();
    });

    // Task List Actions: Delete, Edit, Complete, Add Subtask, and Subtask Checkbox
    taskList.addEventListener("click", (e) => {
      const index = e.target.getAttribute("data-index");
      if (e.target.classList.contains("delete-btn")) {
        tasks.splice(index, 1);
        saveData(); renderTasks(); updateCharts();
        deleteSound.play();
        showToast("Task deleted!");
      }
      if (e.target.classList.contains("edit-btn")) {
        const newText = prompt("Edit task text:", tasks[index].text);
        if (newText === null || !newText.trim()) return;
        let newRating = prompt("Edit task rating (1-5):", tasks[index].rating);
        newRating = parseInt(newRating);
        if (isNaN(newRating) || newRating < 1 || newRating > 5) {
          showToast("Invalid rating.");
          return;
        }
        let newDueDate = prompt("Edit due date (YYYY-MM-DD) or leave blank:", tasks[index].dueDate || "");
        if (newDueDate && isNaN(Date.parse(newDueDate))) {
          showToast("Invalid date format.");
          return;
        }
        let newTag = prompt("Edit task tag (optional):", tasks[index].tag || "");
        tasks[index].text = newText.trim();
        tasks[index].rating = newRating;
        tasks[index].dueDate = newDueDate;
        tasks[index].tag = newTag.trim();
        saveData(); renderTasks(); updateCharts();
        showToast("Task updated!");
      }
      if (e.target.classList.contains("complete-checkbox")) {
        const isChecked = e.target.checked;
        tasks[index].completed = isChecked;
        if (isChecked) {
          if (!tasks[index].completedDate) {
            tasks[index].completedDate = new Date().toISOString().split("T")[0];
          }
          completionSound.play();
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          // Check if all tasks are completed; if so, play achievement sound
          if (tasks.length && tasks.every(task => task.completed)) {
            setTimeout(() => { achievementSound.play(); }, 500);
            showToast("All tasks completed! Great job! 🎉");
          }
        } else {
          tasks[index].completedDate = null;
        }
        saveData(); renderTasks(); updateCharts();
        showToast("Task status updated!");
      }
      if (e.target.classList.contains("add-subtask-btn")) {
        const subtaskText = prompt("Enter subtask text:");
        if (!subtaskText || !subtaskText.trim()) return;
        if (!tasks[index].subtasks) { tasks[index].subtasks = []; }
        tasks[index].subtasks.push({ text: subtaskText.trim(), completed: false });
        saveData(); renderTasks();
        showToast("Subtask added!");
      }
      if (e.target.classList.contains("subtask-checkbox")) {
        const taskIndex = e.target.getAttribute("data-task-index");
        const subtaskIndex = e.target.getAttribute("data-subtask-index");
        tasks[taskIndex].subtasks[subtaskIndex].completed = e.target.checked;
        // If all subtasks are now complete, mark parent as complete.
        const allSubs = tasks[taskIndex].subtasks;
        if (allSubs && allSubs.length && allSubs.every(sub => sub.completed)) {
          tasks[taskIndex].completed = true;
          if (!tasks[taskIndex].completedDate) {
            tasks[taskIndex].completedDate = new Date().toISOString().split("T")[0];
          }
          completionSound.play();
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } else {
          tasks[taskIndex].completed = false;
          tasks[taskIndex].completedDate = null;
        }
        saveData(); renderTasks();
        showToast("Subtask status updated!");
      }
    });

    // Dark Mode Toggle
    modeToggleBtn.addEventListener("click", () => {
      settings.theme = settings.theme === "dark" ? "light" : "dark";
      applySettings();
      saveData();
    });

    // Initialize charts and render tasks on load
    updateCharts();
    renderTasks();
