// Slider para la página Nosotros
let currentSlide = 0;
const slides = document.querySelectorAll('.slide-nosotros');
const prevBtn = document.querySelector('.btn-slider.prev');
const nextBtn = document.querySelector('.btn-slider.next');

function showSlide(index) {
    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
    });
}

function nextSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    showSlide(currentSlide);
}

function prevSlide() {
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    showSlide(currentSlide);
}

if (prevBtn && nextBtn) {
    prevBtn.addEventListener('click', prevSlide);
    nextBtn.addEventListener('click', nextSlide);
}

// Auto-slide cada 5 segundos
let autoplay = setInterval(nextSlide, 5000);

// Pausar autoplay al interactuar
if (prevBtn && nextBtn) {
    [prevBtn, nextBtn].forEach(btn => {
        btn.addEventListener('click', () => {
            clearInterval(autoplay);
        });
    });
}

// Mostrar el primer slide
showSlide(currentSlide);
