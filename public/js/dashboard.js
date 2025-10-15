// Import any required modules here
// Example: import { someFunction } from './someModule.js';

// Export any functions that need to be used elsewhere
export function initializeDashboard() {
  // Sidebar toggle for mobile
  const menuToggle = document.querySelector(".menu-toggle");
  const sidebarToggle = document.querySelector(".sidebar-toggle");
  const sidebar = document.querySelector(".sidebar");

  if (menuToggle) {
    menuToggle.addEventListener("click", function () {
      sidebar.classList.add("active");
    });
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", function () {
      sidebar.classList.remove("active");
    });
  }

  // Close sidebar when clicking outside on mobile
  document.addEventListener("click", function (event) {
    const isClickInsideSidebar = sidebar?.contains(event.target);
    const isClickOnMenuToggle = menuToggle && menuToggle.contains(event.target);

    if (
      !isClickInsideSidebar &&
      !isClickOnMenuToggle &&
      window.innerWidth < 992
    ) {
      sidebar?.classList.remove("active");
    }
  });

  // Initialize dropdowns
  const dropdownElementList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="dropdown"]')
  );
  dropdownElementList.map(function (dropdownToggleEl) {
    return new bootstrap.Dropdown(dropdownToggleEl);
  });

  // Categories main dropdown toggle
  const categoryToggle = document.querySelector(
    ".nav-item.has-submenu > .nav-link"
  );
  if (categoryToggle) {
    categoryToggle.addEventListener("click", function (e) {
      e.preventDefault();
      const parent = this.parentElement;
      parent.classList.toggle("active");
      const submenu = parent.querySelector(".submenu");

      if (submenu?.classList.contains("collapse")) {
        if (parent.classList.contains("active")) {
          $(submenu).collapse("show");
        } else {
          $(submenu).collapse("hide");
        }
      }
    });
  }

  // Individual category toggles
  const categoryToggles = document.querySelectorAll(".category-toggle");
  categoryToggles.forEach(function (toggle) {
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      const parent = this.parentElement;
      parent.classList.toggle("active");
      const sectionItems = parent.querySelector(".section-items");

      // Close other open category sections
      const otherOpenCategories = document.querySelectorAll(
        ".category-item.active"
      );
      otherOpenCategories.forEach(function (item) {
        if (item !== parent) {
          item.classList.remove("active");
          const otherSectionItems = item.querySelector(".section-items");
          $(otherSectionItems).collapse("hide");
        }
      });

      // Toggle current category section
      if (sectionItems?.classList.contains("collapse")) {
        $(sectionItems).collapse("toggle");
      }
    });
  });

  // Section link clicks
  const sectionLinks = document.querySelectorAll(".section-items li a");
  sectionLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      // Remove active class from all section links
      sectionLinks.forEach((item) =>
        item.parentElement.classList.remove("active")
      );

      // Add active class to current link
      this.parentElement.classList.add("active");

      // Get section ID from data attribute
      const sectionId = this.getAttribute("data-section");

      // Load content for this section
      if (sectionId) {
        loadSectionContent(sectionId);
      }
    });
  });

  // Toggle between Fields and Code views
  setupViewToggle();
}

function setupViewToggle() {
  const fieldsBtn = document.getElementById("fields-btn");
  const codeBtn = document.getElementById("code-btn");
  
  if (fieldsBtn) {
    fieldsBtn.addEventListener("click", function () {
      this.classList.add("active", "btn-primary");
      this.classList.remove("btn-secondary");

      const codeBtn = document.getElementById("code-btn");
      codeBtn.classList.remove("active", "btn-primary");
      codeBtn.classList.add("btn-secondary");

      document.getElementById("fields-view").style.display = "block";
      document.getElementById("code-view").style.display = "none";
    });
  }

  if (codeBtn) {
    codeBtn.addEventListener("click", function () {
      this.classList.add("active", "btn-primary");
      this.classList.remove("btn-secondary");

      const fieldsBtn = document.getElementById("fields-btn");
      fieldsBtn.classList.remove("active", "btn-primary");
      fieldsBtn.classList.add("btn-secondary");

      document.getElementById("fields-view").style.display = "none";
      document.getElementById("code-view").style.display = "block";
    });
  }
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener("DOMContentLoaded", initializeDashboard);

// Function to load section content
function loadSectionContent(sectionId) {
  const contentWrapper = document.querySelector(".content-wrapper");

  // You can replace this with actual AJAX calls to load content
  let content = "";

  // Example content based on section ID
  switch (sectionId) {
    case "ghibli-hero":
      content = `
                  <div class="section-content">
                      <h2 class="mb-4">Ghibli Hero Section</h2>
                      <div class="row">
                          <div class="col-md-8">
                              <div class="card">
                                  <img src="https://via.placeholder.com/800x400?text=Ghibli+Hero+Banner" class="card-img-top" alt="Ghibli Hero">
                                  <div class="card-body">
                                      <h5 class="card-title">Studio Ghibli Showcase</h5>
                                      <p class="card-text">Customizable hero banner featuring Studio Ghibli's iconic art style and characters.</p>
                                      <a href="#" class="btn btn-primary">Edit Banner</a>
                                  </div>
                              </div>
                          </div>
                          <div class="col-md-4">
                              <div class="card mb-3">
                                  <div class="card-header">Banner Settings</div>
                                  <div class="card-body">
                                      <div class="mb-3">
                                          <label class="form-label">Banner Title</label>
                                          <input type="text" class="form-control" value="Studio Ghibli Showcase">
                                      </div>
                                      <div class="mb-3">
                                          <label class="form-label">Banner Subtitle</label>
                                          <input type="text" class="form-control" value="Explore the magical world">
                                      </div>
                                      <button class="btn btn-success">Save Changes</button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>`;
      break;

    case "3d-text":
      content = `<div class="section-content">
  <h2 class="mb-4">Ghibli Hero Section</h2>
  
  <div class="card mb-4">
      <div class="card-header">Hero Banner Configuration</div>
      <div class="card-body">
          <div class="mb-3">
              <label class="form-label">Title</label>
              <input type="text" class="form-control" id="banner-title" value="Studio Ghibli Showcase">
          </div>
          <div class="mb-3">
              <label class="form-label">Subtitle</label>
              <input type="text" class="form-control" id="banner-subtitle" value="Explore the magical world">
          </div>
          <div class="mb-3">
              <label class="form-label">Images</label>
              <div class="image-preview-area border p-3 rounded">
                  <div class="row" id="image-preview-container">
                      <div class="col-md-4 mb-3">
                          <img src="https://via.placeholder.com/300x200?text=Ghibli+Image+1" class="img-thumbnail" alt="Ghibli Image">
                          <button class="btn btn-sm btn-danger mt-2 w-100">Remove</button>
                      </div>
                      <div class="col-md-4 mb-3">
                          <img src="https://via.placeholder.com/300x200?text=Ghibli+Image+2" class="img-thumbnail" alt="Ghibli Image">
                          <button class="btn btn-sm btn-danger mt-2 w-100">Remove</button>
                      </div>
                      <div class="col-md-4 mb-3">
                          <img src="https://via.placeholder.com/300x200?text=Ghibli+Image+3" class="img-thumbnail" alt="Ghibli Image">
                          <button class="btn btn-sm btn-danger mt-2 w-100">Remove</button>
                      </div>
                  </div>
                  <button class="btn btn-outline-primary mt-2">Add Image</button>
              </div>
          </div>
          <button class="btn btn-success">Save Changes</button>
      </div>
  </div>
</div>`;
      break;

    case "pixel-characters":
      content = `
                  <div class="section-content">
                      <h2 class="mb-4">Pixel Art Characters</h2>
                      <div class="row">
                          <div class="col-lg-9">
                              <div class="card">
                                  <div class="card-header d-flex justify-content-between align-items-center">
                                      <h5 class="mb-0">Character Gallery</h5>
                                      <button class="btn btn-sm btn-primary">Add New</button>
                                  </div>
                                  <div class="card-body">
                                      <div class="row">
                                          <div class="col-md-3 col-sm-6 mb-4">
                                              <div class="card h-100">
                                                  <img src="https://via.placeholder.com/150?text=Pixel+Hero" class="card-img-top" alt="Pixel Character">
                                                  <div class="card-body">
                                                      <h6 class="card-title">Pixel Hero</h6>
                                                      <p class="card-text small">Main character with sword</p>
                                                  </div>
                                              </div>
                                          </div>
                                          <div class="col-md-3 col-sm-6 mb-4">
                                              <div class="card h-100">
                                                  <img src="https://via.placeholder.com/150?text=Pixel+Wizard" class="card-img-top" alt="Pixel Character">
                                                  <div class="card-body">
                                                      <h6 class="card-title">Pixel Wizard</h6>
                                                      <p class="card-text small">Magic user with staff</p>
                                                  </div>
                                              </div>
                                          </div>
                                          <div class="col-md-3 col-sm-6 mb-4">
                                              <div class="card h-100">
                                                  <img src="https://via.placeholder.com/150?text=Pixel+Archer" class="card-img-top" alt="Pixel Character">
                                                  <div class="card-body">
                                                      <h6 class="card-title">Pixel Archer</h6>
                                                      <p class="card-text small">Ranged fighter with bow</p>
                                                  </div>
                                              </div>
                                          </div>
                                          <div class="col-md-3 col-sm-6 mb-4">
                                              <div class="card h-100">
                                                  <img src="https://via.placeholder.com/150?text=Pixel+Villain" class="card-img-top" alt="Pixel Character">
                                                  <div class="card-body">
                                                      <h6 class="card-title">Pixel Villain</h6>
                                                      <p class="card-text small">Main antagonist</p>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          <div class="col-lg-3">
                              <div class="card">
                                  <div class="card-header">Filters</div>
                                  <div class="card-body">
                                      <div class="mb-3">
                                          <label class="form-label">Character Type</label>
                                          <select class="form-select form-select-sm">
                                              <option>All Types</option>
                                              <option>Heroes</option>
                                              <option>Villains</option>
                                              <option>NPCs</option>
                                          </select>
                                      </div>
                                      <div class="mb-3">
                                          <label class="form-label">Style</label>
                                          <select class="form-select form-select-sm">
                                              <option>All Styles</option>
                                              <option>Fantasy</option>
                                              <option>Sci-Fi</option>
                                              <option>Modern</option>
                                          </select>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>`;
      break;

    case "manga-panels":
      content = `
                  <div class="section-content">
                      <h2 class="mb-4">Manga Panels Section</h2>
                      <div class="row">
                          <div class="col-md-8">
                              <div class="card mb-4">
                                  <div class="card-header d-flex justify-content-between align-items-center">
                                      <h5 class="mb-0">Panel Editor</h5>
                                      <div>
                                          <button class="btn btn-sm btn-outline-secondary me-2">Preview</button>
                                          <button class="btn btn-sm btn-primary">Save</button>
                                      </div>
                                  </div>
                                  <div class="card-body">
                                      <div class="panel-canvas bg-light p-3 mb-3" style="min-height: 500px; border: 1px dashed #ccc;">
                                          <div class="row">
                                              <div class="col-md-6 mb-3">
                                                  <div class="panel-item bg-white p-2" style="height: 240px; border: 1px solid #ddd;">
                                                      <img src="https://via.placeholder.com/400x220?text=Manga+Panel+1" class="img-fluid" alt="Manga Panel">
                                                  </div>
                                              </div>
                                              <div class="col-md-6 mb-3">
                                                  <div class="panel-item bg-white p-2" style="height: 240px; border: 1px solid #ddd;">
                                                      <img src="https://via.placeholder.com/400x220?text=Manga+Panel+2" class="img-fluid" alt="Manga Panel">
                                                  </div>
                                              </div>
                                              <div class="col-12 mb-3">
                                                  <div class="panel-item bg-white p-2" style="height: 240px; border: 1px solid #ddd;">
                                                      <img src="https://via.placeholder.com/800x220?text=Manga+Panel+3" class="img-fluid" alt="Manga Panel">
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          <div class="col-md-4">
                              <div class="card mb-4">
                                  <div class="card-header">Panel Settings</div>
                                  <div class="card-body">
                                      <div class="mb-3">
                                          <label class="form-label">Layout</label>
                                          <select class="form-select">
                                              <option>Standard Grid</option>
                                              <option>Dynamic</option>
                                              <option>Diagonal</option>
                                              <option>Asymmetric</option>
                                          </select>
                                      </div>
                                      <div class="mb-3">
                                          <label class="form-label">Style</label>
                                          <select class="form-select">
                                              <option>Shōnen</option>
                                              <option>Shōjo</option>
                                              <option>Seinen</option>
                                              <option>Josei</option>
                                          </select>
                                      </div>
                                      <div class="mb-3">
                                          <label class="form-label">Border Width</label>
                                          <input type="range" class="form-range" min="0" max="5" value="1">
                                      </div>
                                      <div class="mb-3">
                                          <label class="form-label">Panel Spacing</label>
                                          <input type="range" class="form-range" min="0" max="20" value="10">
                                      </div>
                                  </div>
                              </div>
                              <div class="card">
                                  <div class="card-header">Tools</div>
                                  <div class="card-body">
                                      <div class="btn-group mb-3 w-100">
                                          <button class="btn btn-sm btn-outline-secondary">Add Panel</button>
                                          <button class="btn btn-sm btn-outline-secondary">Delete</button>
                                          <button class="btn btn-sm btn-outline-secondary">Duplicate</button>
                                      </div>
                                      <div class="btn-group w-100">
                                          <button class="btn btn-sm btn-outline-secondary">Text</button>
                                          <button class="btn btn-sm btn-outline-secondary">Effect</button>
                                          <button class="btn btn-sm btn-outline-secondary">SFX</button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>`;
      break;

    default:
      content = `
                  <div class="section-content">
                      <div class="alert alert-info">
                          <h4>Section: ${sectionId}</h4>
                          <p>Please select content for this section.</p>
                      </div>
                  </div>`;
  }

  // Update the content
  contentWrapper.innerHTML = content;
}

// Highlight active menu item based on current URL
const currentLocation = window.location.pathname;
const menuItems = document.querySelectorAll(".nav-item");
menuItems.forEach(function (item) {
  if (!item.classList.contains("has-submenu")) {
    const link = item.querySelector(".nav-link");
    if (link && link.getAttribute("href") === currentLocation) {
      item.classList.add("active");
    }
  }
});
