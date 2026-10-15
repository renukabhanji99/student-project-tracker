const projects = [];

let editingId = null;
let loading = false;
let saving = false;
let loadFailed = false;

const projectForm = document.getElementById("project-form");
const nameInput = document.getElementById("name");
const statusInput = document.getElementById("status");
const projectList = document.getElementById("project-list");
const emptyState = document.getElementById("empty-state");
const saveButton = document.getElementById("save-button");
const cancelButton = document.getElementById("cancel-button");
const formTitle = document.getElementById("form-title");
const message = document.getElementById("message");

function setMessage(text) {
  message.textContent = text;
}

function updateControls() {
  const busy = loading || saving;

  saveButton.disabled = busy;
  cancelButton.disabled = busy;

  projectForm.querySelectorAll("input, select").forEach((control) => {
    control.disabled = busy;
  });

  projectList.querySelectorAll("button").forEach((button) => {
    button.disabled = busy;
  });

  saveButton.textContent = saving
    ? editingId !== null
      ? "Saving changes..."
      : "Saving..."
    : editingId !== null
      ? "Save changes"
      : "Save Project";
}

function resetForm() {
  editingId = null;
  projectForm.reset();
  nameInput.setCustomValidity("");

  formTitle.textContent = "Add a Project";
  cancelButton.hidden = true;
  updateControls();
}

function isValidProject(project) {
  return (
    project !== null &&
    typeof project === "object" &&
    !Array.isArray(project) &&
    Number.isSafeInteger(project.id) &&
    project.id > 0 &&
    typeof project.name === "string" &&
    project.name.trim() !== "" &&
    ["Planned", "In Progress", "Completed"].includes(project.status)
  );
}

async function getApiError(response) {
  try {
    const data = await response.json();

    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }

    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  } catch {
    // The server may return a non-JSON error response.
  }

  return `Request failed (${response.status} ${response.statusText}).`;
}

async function requestJson(url, options = {}) {
  let response;

  try {
    response = await fetch(url, options);
  } catch {
    throw new Error(
      "Could not connect to the server. Check that the server is running and try again."
    );
  }

  if (!response.ok) {
    throw new Error(await getApiError(response));
  }

  if (response.status === 204) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }
}

async function loadProjects({ showLoading = true } = {}) {
  if (loading) {
    return false;
  }

  loading = true;
  loadFailed = false;

  if (showLoading) {
    setMessage("Loading projects...");
  }

  updateControls();

  try {
    const data = await requestJson("/api/projects");

    if (!Array.isArray(data) || !data.every(isValidProject)) {
      throw new Error("The server returned invalid project data.");
    }

    const ids = data.map((project) => project.id);

    if (new Set(ids).size !== ids.length) {
      throw new Error("The server returned duplicate project IDs.");
    }

    projects.splice(0, projects.length, ...data);

    if (
      editingId !== null &&
      !projects.some((project) => project.id === editingId)
    ) {
      resetForm();
      setMessage("The project being edited no longer exists.");
    }

    renderProjects();

    if (projects.length === 0) {
      setMessage("No projects added yet.");
    } else if (showLoading) {
      setMessage("Projects loaded successfully.");
    }

    return true;
  } catch (error) {
    loadFailed = true;
    renderProjects();
    setMessage(`Could not load projects: ${error.message}`);
    return false;
  } finally {
    loading = false;
    updateControls();
  }
}

function renderProjects() {
  projectList.replaceChildren();

  projects.forEach((project) => {
    const listItem = document.createElement("li");

    const projectName = document.createElement("span");
    projectName.textContent = project.name;

    const projectStatus = document.createElement("span");
    projectStatus.textContent = ` — ${project.status}`;

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.setAttribute("aria-label", `Edit ${project.name}`);

    editButton.addEventListener("click", () => {
      if (loading || saving) {
        return;
      }

      editingId = project.id;
      nameInput.value = project.name;
      statusInput.value = project.status;
      nameInput.setCustomValidity("");

      formTitle.textContent = "Edit Project";
      cancelButton.hidden = false;
      setMessage("");

      updateControls();
      nameInput.focus();
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${project.name}`);

    deleteButton.addEventListener("click", async () => {
      if (loading || saving) {
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete the project "${project.name}"?`
      );

      if (!confirmed) {
        return;
      }

      await deleteProject(project.id);
    });

    listItem.append(
      projectName,
      projectStatus,
      document.createTextNode(" "),
      editButton,
      document.createTextNode(" "),
      deleteButton
    );

    projectList.appendChild(listItem);
  });

  emptyState.hidden = projects.length > 0 || loadFailed;
}

async function createProject(project) {
  saving = true;
  updateControls();
  setMessage("Saving project...");

  try {
    await requestJson("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project)
    });

    const loaded = await loadProjects({ showLoading: false });

    if (loaded) {
      resetForm();
      setMessage("Project added successfully.");
    }
  } catch (error) {
    setMessage(`Could not add project: ${error.message}`);
  } finally {
    saving = false;
    updateControls();
  }
}

async function updateProject(id, project) {
  saving = true;
  updateControls();
  setMessage("Saving changes...");

  try {
    await requestJson(`/api/projects/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project)
    });

    const loaded = await loadProjects({ showLoading: false });

    if (loaded) {
      resetForm();
      setMessage("Project updated successfully.");
    }
  } catch (error) {
    setMessage(`Could not update project: ${error.message}`);
  } finally {
    saving = false;
    updateControls();
  }
}

async function deleteProject(id) {
  saving = true;
  updateControls();
  setMessage("Deleting project...");

  try {
    await requestJson(`/api/projects/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    if (editingId === id) {
      resetForm();
    }

    const loaded = await loadProjects({ showLoading: false });

    if (loaded) {
      setMessage("Project deleted successfully.");
    }
  } catch (error) {
    setMessage(`Could not delete project: ${error.message}`);
  } finally {
    saving = false;
    updateControls();
  }
}

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (loading || saving) {
    return;
  }

  const name = nameInput.value.trim();
  const status = statusInput.value;

  if (!name) {
    nameInput.setCustomValidity("Please enter a project name.");
    nameInput.reportValidity();
    return;
  }

  nameInput.setCustomValidity("");

  const project = { name, status };

  if (editingId !== null) {
    const id = editingId;

    if (!projects.some((item) => item.id === id)) {
      resetForm();
      setMessage("The project could not be found. Please reload the list.");
      return;
    }

    await updateProject(id, project);
  } else {
    await createProject(project);
  }
});

cancelButton.addEventListener("click", () => {
  if (loading || saving) {
    return;
  }

  resetForm();
  setMessage("Editing cancelled.");
});

nameInput.addEventListener("input", () => {
  nameInput.setCustomValidity("");
});

loadProjects();