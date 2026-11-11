document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  const sidebar = document.getElementById('shopSidebar');
  const sidebarCollapseBtn = document.getElementById('sidebarCollapse');
  const themeToggleBtn = document.getElementById('themeToggle');
  const mobileThemeToggleBtn = document.getElementById('mobileThemeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const mobileThemeIcon = document.getElementById('mobileThemeIcon');
  const themeText = document.getElementById('themeText');
  
  const mobileToggleBtn = document.getElementById('mobileSidebarToggle');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  // 1. Theme Initialization & Handling
  const savedTheme = localStorage.getItem('shop_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeUI(savedTheme);

  function updateThemeUI(theme) {
    const isDark = theme === 'dark';
    if (themeIcon) themeIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    if (mobileThemeIcon) mobileThemeIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    if (themeText) themeText.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('shop_theme', newTheme);
    updateThemeUI(newTheme);
  }

  if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
  if (mobileThemeToggleBtn) mobileThemeToggleBtn.addEventListener('click', toggleTheme);

  // 2. Desktop Sidebar Collapse/Expand State Handling
  const savedSidebarState = localStorage.getItem('shop_sidebar_collapsed');
  if (savedSidebarState === 'true' && window.innerWidth > 1024) {
    sidebar.classList.add('collapsed');
  }

  if (sidebarCollapseBtn) {
    sidebarCollapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      const isCollapsed = sidebar.classList.contains('collapsed');
      localStorage.setItem('shop_sidebar_collapsed', isCollapsed);
    });
  }

  // 3. Mobile Drawer Handling
  function toggleMobileSidebar() {
    sidebar.classList.toggle('mobile-open');
    sidebarOverlay.classList.toggle('active');
  }

  if (mobileToggleBtn) {
    mobileToggleBtn.addEventListener('click', toggleMobileSidebar);
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', toggleMobileSidebar);
  }
}); 