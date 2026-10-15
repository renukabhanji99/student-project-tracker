
const projects = [];

const STORAGE_KEY = "workshop-projects-v1";

let editingId = null;
let storageReady = true;
let storageProblem = "";

const projectForm = document.getElementById("project-form");
const nameInput = document.getElementById("name");
const statusInput = document.getElementById("status");
const projectList = document.getElementById("project-list");
const emptyState = document.getElementById("empty-state");
const saveButton = document.getElementById("save-button");
const cancelButton = document.getElementById("cancel-button");
const formTitle = document.getElementById("form-title");
const message = document.getElementById("message");

function resetForm() {
  editingId = null;
  projectForm.reset();
  nameInput.setCustomValidity("");

  saveButton.textContent = "Save Project";
  formTitle.textContent = "Add a Project";
  cancelButton.hidden = true;
}

function isValidProject(project) {
  return (
    project !== null &&
    typeof project === "object" &&
    !Array.isArray(project) &&
    typeof project.id === "string" &&
    project.id.trim() !== "" &&
    typeof project.name === "string" &&
    project.name.trim() !== "" &&
    ["Planned", "In Progress", "Completed"].includes(project.status)
  );
}

function loadProjects() {
  let storedData;

  try {
    storedData = window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    storageReady = false;
    storageProblem =
      "Saved projects could not be read from browser storage. Changes cannot be saved.";
    message.textContent = storageProblem;
    renderProjects();
    return;
  }

  if (storedData === null) {
    renderProjects();
    return;
  }

  let savedProjects;

  try {
    savedProjects = JSON.parse(storedData);
  } catch (error) {
    storageReady = false;
    storageProblem =
      "Saved project data is invalid. It has not been overwritten.";
    message.textContent = storageProblem;
    renderProjects();
    return;
  }

  const validArray =
    Array.isArray(savedProjects) &&
    savedProjects.every(isValidProject);

  const idsAreUnique =
    validArray &&
    new Set(savedProjects.map((project) => project.id)).size ===
      savedProjects.length;

  if (!validArray || !idsAreUnique) {
    storageReady = false;
    storageProblem =
      "Saved project data is missing or malformed. It has not been overwritten.";
    message.textContent = storageProblem;
    renderProjects();
    return;
  }

  projects.push(...savedProjects);
  renderProjects();
}

function saveProjects() {
  if (!storageReady) {
    message.textContent = storageProblem;
    return false;
  }

  try {
    const projectsText = JSON.stringify(projects);
    window.localStorage.setItem(STORAGE_KEY, projectsText);
    return true;
  } catch (error) {
    message.textContent =
      "Changes could not be saved to browser storage. They remain only in this page for now.";
    return false;
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
      if (!storageReady) {
        message.textContent = storageProblem;
        return;
      }

      editingId = project.id;

      nameInput.value = project.name;
      statusInput.value = project.status;
      nameInput.setCustomValidity("");

      saveButton.textContent = "Save changes";
      formTitle.textContent = "Edit Project";
      cancelButton.hidden = false;
      message.textContent = "";

      nameInput.focus();
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${project.name}`);

    deleteButton.addEventListener("click", () => {
      if (!storageReady) {
        message.textContent = storageProblem;
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete the project "${project.name}"?`
      );

      if (!confirmed) {
        return;
      }

      const deletingEditedProject = editingId === project.id;

      const projectIndex = projects.findIndex(
        (item) => item.id === project.id
      );

      if (projectIndex === -1) {
        return;
      }

      projects.splice(projectIndex, 1);

      if (deletingEditedProject) {
        resetForm();
      }

      renderProjects();

      if (saveProjects()) {
        message.textContent = "Project deleted successfully.";
      }
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

  if (emptyState) {
    emptyState.hidden = projects.length > 0;
  }
}

projectForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!storageReady) {
    message.textContent = storageProblem;
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

  if (editingId !== null) {
    const project = projects.find(
      (item) => item.id === editingId
    );

    if (!project) {
      resetForm();
      renderProjects();
      message.textContent = "The project could not be found.";
      return;
    }

    project.name = name;
    project.status = status;

    resetForm();
    renderProjects();

    if (saveProjects()) {
      message.textContent = "Project updated successfully.";
    }
  } else {
    projects.push({
      id: crypto.randomUUID(),
      name: name,
      status: status
    });

    resetForm();
    renderProjects();

    if (saveProjects()) {
      message.textContent = "Project added successfully.";
    }
  }
});

cancelButton.addEventListener("click", () => {
  resetForm();
  message.textContent = "Editing cancelled.";
});

nameInput.addEventListener("input", () => {
  nameInput.setCustomValidity("");
});

loadProjects();