import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

// Your Firebase config
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
const db = getFirestore(app);

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

  // Get the employee-only nav links
  const checkinLink     = document.getElementById("checkinBtn");
  const employeeHubLink = document.getElementById("employeeHubBtn");

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
      window.location.href = "home";
    });
  }

  // Book Now logic
  if (bookBtn) {
    bookBtn.addEventListener("click", () => {
      if (auth.currentUser) {
        window.location.href = "rooms";
      } else {
        window.location.href = "login?from=rooms";
      }
    });
  }

  // Hero login button
  if (heroLoginBtn) {
    heroLoginBtn.addEventListener("click", () => {
      window.location.href = "login?from=home";
    });
  }

  // Listen for auth state
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log("User logged in:", user.uid);
      if (loginBtnNav)     loginBtnNav.style.display = "none"; 
      if (accountDropdown) accountDropdown.style.display = "inline-block";
      if (heroLoginBtn)    heroLoginBtn.style.display = "none";

      // By default, keep employee-specific links hidden
      if (checkinLink)     checkinLink.style.display = "none";
      if (employeeHubLink) employeeHubLink.style.display = "none";

      // Change the collection name if your data is in a different collection
      const collectionName = "Employee"; // For example: "Employee" or "users"

      try {
        const userDocRef = doc(db, collectionName, user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          console.log("Fetched user data:", userData);
          // Check if the user's role is 'employee'
          if (userData.role && userData.role.toLowerCase() === "employee") {
            if (checkinLink)     checkinLink.style.display = "inline-block";
            if (employeeHubLink) employeeHubLink.style.display = "inline-block";
          } else {
            console.log("User role is not employee:", userData.role);
          }
        } else {
          console.log("No such user document found in collection:", collectionName);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    } else {
      // If not logged in, show default login UI and keep employee links hidden
      if (loginBtnNav)     loginBtnNav.style.display = "inline-block";
      if (accountDropdown) accountDropdown.style.display = "none";
      if (heroLoginBtn)    heroLoginBtn.style.display = "inline-block";
      if (checkinLink)     checkinLink.style.display = "none";
      if (employeeHubLink) employeeHubLink.style.display = "none";
    }
  });

  // -----------------------
  // 2) Simple Carousel Logic
  // -----------------------
  const slides = document.querySelectorAll(".slide");
  if (slides.length > 0) {
    let currentIndex = 0;

    function showSlide(index) {
      slides.forEach((slide) => {
        slide.classList.remove("active");
      });
      slides[index].classList.add("active");
    }

    function nextSlide() {
      currentIndex = (currentIndex + 1) % slides.length;
      showSlide(currentIndex);
    }

    showSlide(currentIndex);
    setInterval(nextSlide, 3000);
  }
});
