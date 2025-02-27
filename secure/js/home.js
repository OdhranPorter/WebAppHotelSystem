// home.js

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";

// Your Firebase config (use the same as in login.js / rooms.js)
const firebaseConfig = {
  apiKey: "AIzaSyDw5aeA0uwE7R06Ht1wjkx6TcehPWs0Hac",
  authDomain: "hotel-booking-3aad3.firebaseapp.com",
  projectId: "hotel-booking-3aad3",
  storageBucket: "hotel-booking-3aad3.firbasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
  console.log("home.js loaded");

  // -----------------------
  // 1) Handle Auth UI Logic
  // -----------------------
  const loginBtnNav     = document.getElementById("loginBtn");      // The nav link
  const accountDropdown = document.getElementById("accountDropdown");
  const accountBtn      = document.getElementById("accountBtn");
  const accountMenu     = document.getElementById("accountMenu");
  const logoutBtn       = document.getElementById("logoutBtn");

  // The hero buttons
  const heroLoginBtn = document.getElementById("loginButton");
  const bookBtn      = document.getElementById("bookButton");

  // Toggle the account menu
  if (accountBtn && accountMenu) {
    accountBtn.addEventListener("click", () => {
      accountMenu.style.display =
        (accountMenu.style.display === "block") ? "none" : "block";
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      // Optionally reload or go to home
      window.location.href = "home.html";
    });
  }

  // Book Now logic
  if (bookBtn) {
    bookBtn.addEventListener("click", () => {
      // If user is logged in => go to rooms
      // else => go to login?from=rooms.html
      if (auth.currentUser) {
        window.location.href = "rooms.html";
      } else {
        window.location.href = "login.html?from=rooms.html";
      }
    });
  }

  // Hero login button
  if (heroLoginBtn) {
    heroLoginBtn.addEventListener("click", () => {
      // Possibly pass ?from=home
      window.location.href = "login.html?from=home.html";
    });
  }

  // Listen for auth state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is logged in
      if (loginBtnNav)     loginBtnNav.style.display = "none"; 
      if (accountDropdown) accountDropdown.style.display = "inline-block";
      if (heroLoginBtn)    heroLoginBtn.style.display = "none";
    } else {
      // User not logged in
      if (loginBtnNav)     loginBtnNav.style.display = "inline-block";
      if (accountDropdown) accountDropdown.style.display = "none";
      if (heroLoginBtn)    heroLoginBtn.style.display = "inline-block";
    }
  });

  // -----------------------
  // 2) Simple Carousel Logic
  // -----------------------
  const slides = document.querySelectorAll(".slide");
  if (slides.length > 0) {
    let currentIndex = 0;

    // Show a given slide index (hide others)
    function showSlide(index) {
      slides.forEach((slide) => {
        slide.classList.remove("active");
      });
      slides[index].classList.add("active");
    }

    // Advance to the next slide
    function nextSlide() {
      currentIndex = (currentIndex + 1) % slides.length;
      showSlide(currentIndex);
    }

    // Display the first slide initially
    showSlide(currentIndex);

    // Cycle slides every 3 seconds
    setInterval(nextSlide, 3000);
  }
});
