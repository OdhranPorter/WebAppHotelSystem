// rooms.js

import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDw5aeA0uwE7R06Ht1wjkx6TcehPWs0Hac",
  authDomain: "hotel-booking-3aad3.firebaseapp.com",
  projectId: "hotel-booking-3aad3",
  storageBucket: "hotel-booking-3aad3.firebasestorage.app",
  messagingSenderId: "385718256742",
  appId: "1:385718256742:web:03fc7761dbf7e7345ad9a7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/***************************************************
 * Show/Hide nav items based on auth state
 ***************************************************/
document.addEventListener("DOMContentLoaded", async () => {
  console.log("rooms.js loaded");

  // Nav elements
  const accountDropdown = document.getElementById("accountDropdown");
  const accountBtn      = document.getElementById("accountBtn");
  const accountMenu     = document.getElementById("accountMenu");
  const logoutBtn       = document.getElementById("logoutBtn");
  const loginBtn        = document.getElementById("loginBtn");

  // Toggle account menu
  if (accountBtn && accountMenu) {
    accountBtn.addEventListener("click", () => {
      accountMenu.style.display = (accountMenu.style.display === "block") ? "none" : "block";
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "rooms";
    });
  }

  // Watch auth state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Logged in => show account, hide login
      if (accountDropdown) accountDropdown.style.display = "inline-block";
      if (loginBtn)        loginBtn.style.display = "none";
    } else {
      // Not logged in => hide account, show login
      if (accountDropdown) accountDropdown.style.display = "none";
      if (loginBtn)        loginBtn.style.display = "inline-block";
    }
  });

  /***************************************************
   * 4. FETCH & DISPLAY ROOM TYPES
   ***************************************************/
  const roomsContainer = document.getElementById("roomsContainer");
  try {
    // Fetch all room types
    const querySnapshot = await getDocs(collection(db, "RoomType"));
    
    querySnapshot.forEach(async (typeDoc) => {
      const roomType = typeDoc.id;
      const typeData = typeDoc.data();

      // Create card
      const card = document.createElement("div");
      card.classList.add("room-card");

      // Build carousel
      const carousel = document.createElement("div");
      carousel.classList.add("carousel");
      typeData.images.forEach((image, index) => {
        const img = document.createElement("img");
        img.src = image;
        img.alt = `${roomType} Room Image ${index + 1}`;
        img.classList.add("carousel-image");
        if (index === 0) img.style.display = "block";
        carousel.appendChild(img);
      });

      // Add carousel navigation buttons
      const prevButton = document.createElement("button");
      prevButton.innerHTML = "&#10094;";
      prevButton.classList.add("carousel-button", "prev");
      prevButton.addEventListener("click", () => navigateCarousel(carousel, -1));

      const nextButton = document.createElement("button");
      nextButton.innerHTML = "&#10095;";
      nextButton.classList.add("carousel-button", "next");
      nextButton.addEventListener("click", () => navigateCarousel(carousel, 1));

      carousel.appendChild(prevButton);
      carousel.appendChild(nextButton);

      // Build amenities list
      const amenitiesList = typeData.amenities.map((amenity) => {
        const icon = getAmenityIcon(amenity);
        return `
          <li>
            <img src="${icon}" alt="${amenity}" class="amenity-icon" />
            <span>${amenity}</span>
          </li>
        `;
      }).join("");

      // Card content
      card.innerHTML = `
        <h2>${roomType} Room</h2>
        <p>Price: €${typeData.price} / night</p>
        <p><strong>Amenities:</strong></p>
        <ul class="amenities-list">
          ${amenitiesList}
        </ul>
        <button class="book-now-btn">Book Now</button>
      `;

      // Insert carousel at the top
      card.insertBefore(carousel, card.firstChild);

      // Book Now action
      const bookBtn = card.querySelector(".book-now-btn");
      bookBtn.addEventListener("click", () => {
        const user = auth.currentUser;
        if (!user) {
          const redirectUrl = `booking?roomType=${encodeURIComponent(roomType)}`;
          window.location.href = `login?redirect=${encodeURIComponent(redirectUrl)}`;
        } else {
          window.location.href = `booking?roomType=${encodeURIComponent(roomType)}`;
        }
      });

      roomsContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Error fetching room types:", error);
    roomsContainer.innerHTML = "<p>Failed to load rooms. Please try again later.</p>";
  }
});

/***************************************************
 * HELPER FUNCTIONS
 ***************************************************/
function getAmenityIcon(amenity) {
  const name = amenity.toLowerCase();
  if (name.includes("wi-fi") || name.includes("wifi")) return "images/icon_wifi.png";
  if (name.includes("tv")) return "images/icon_tv.png";
  if (name.includes("mini-bar") || name.includes("mini bar")) return "images/icon_minibar.jpg";
  if (name.includes("room service")) return "images/icon_service.jpg";
  if (name.includes("air conditioning") || name.includes("aircon")) return "images/icon_aircon.png";
  if (name.includes("crib")) return "images/icon_crib.png";
  if (name.includes("towels")) return "images/icon_towels.png";
  return "images/icon_amenity.png";
}

// Carousel navigation logic
function navigateCarousel(carousel, direction) {
  const images = carousel.querySelectorAll(".carousel-image");
  let currentIndex = 0;

  // Find the currently visible image
  images.forEach((img, index) => {
    if (img.style.display === "block") {
      currentIndex = index;
      img.style.display = "none"; // Hide current image
    }
  });

  // Calculate the next image index
  let nextIndex = currentIndex + direction;
  if (nextIndex >= images.length) nextIndex = 0; // Loop to first image
  if (nextIndex < 0) nextIndex = images.length - 1; // Loop to last image

  // Show the next image
  images[nextIndex].style.display = "block";
}