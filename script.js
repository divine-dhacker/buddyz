
    







const menuToggle = document.getElementById("menu-toggle");
const closeBtn = document.getElementById("close-btn");
const sidebar = document.getElementById("sidebar");

// Toggle sidebar
menuToggle.addEventListener("click", () => {
  sidebar.classList.add("show");
  document.body.style.overflow = 'hidden'; // Prevent scrolling when sidebar is open
});

// Close sidebar
closeBtn.addEventListener("click", closeSidebar);

// Close when clicking outside the sidebar
document.addEventListener('click', (e) => {
  if (!sidebar.contains(e.target) && e.target !== menuToggle) {
    closeSidebar();
  }
});

// Close when pressing Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSidebar();
  }
});

function closeSidebar() {
  sidebar.classList.remove("show");
  document.body.style.overflow = ''; // Restore scrolling
}

setInterval(() => {
  const animatedBtn = document.querySelector('.animate');
  if (animatedBtn) {
    animatedBtn.classList.remove('animate');
    
    // Force reflow to restart the animation
    void animatedBtn.offsetWidth;
    
    animatedBtn.classList.add('animate');
  }
}, 5000);



