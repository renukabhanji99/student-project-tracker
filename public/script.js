
const projects = [];

const projectForm = document.getElementById("project-form");
const nameInput = document.getElementById("name");
const statusInput = document.getElementById("status");
const projectList = document.getElementById("project-list");
const emptyState = document.getElementById("empty-state");

function renderProjects() {
  projectList.replaceChildren();

  projects.forEach((project) => {
    const listItem = document.createElement("li");

    const projectName = document.createElement("span");
    projectName.textContent = project.name;

    const projectStatus = document.createElement("span");
    projectStatus.textContent = ` — ${project.status}`;

    listItem.append(projectName, projectStatus);
    projectList.appendChild(listItem);
  });

  if (emptyState) {
    emptyState.hidden = projects.length > 0;
  }
}

projectForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const status = statusInput.value;

  if (!name) {
    nameInput.setCustomValidity("Please enter a project name.");
    nameInput.reportValidity();
    nameInput.addEventListener(
      "input",
      () => nameInput.setCustomValidity(""),
      { once: true }
    );
    return;
  }

  const project = {
    id: crypto.randomUUID(),
    name: name,
    status: status
  };

  projects.push(project);

  renderProjects();

  projectForm.reset();
  nameInput.setCustomValidity("");
});