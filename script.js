document.addEventListener("DOMContentLoaded", function() {
    // Плавный скролл по якорям
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
      link.addEventListener("click", function(e) {
        e.preventDefault();
        const targetId = this.getAttribute("href");
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: "smooth" });
        }
      });
    });
  
    // Скрытие стрелки при прокрутке
    const scrollArrow = document.getElementById("scroll-arrow");
    window.addEventListener("scroll", () => {
      if (window.pageYOffset > 50) {
        scrollArrow.style.opacity = 0;
      } else {
        scrollArrow.style.opacity = 1;
      }
    });
  });
  