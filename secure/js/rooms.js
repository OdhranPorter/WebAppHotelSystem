// rooms.js

import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";

// REPLACE with your actual config:
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
   * 4. FETCH & DISPLAY ROOMS
   ***************************************************/
  const roomsContainer = document.getElementById("roomsContainer");
  try {
    // Fetch room types from the "RoomType" collection
    const querySnapshot = await getDocs(collection(db, "RoomType"));
    
    querySnapshot.forEach((docSnap) => {
      const roomType = docSnap.id; // Document ID is the room type (e.g., "Standard", "Family")
      const roomData = docSnap.data(); // Contains price, amenities, and images array
      console.log("Room found:", roomType, roomData);

      const price     = roomData.price || 0;
      const amenities = roomData.amenities || [];
      const imagess = roomData.images || []; // Array of image URLs

      // Create card
      const card = document.createElement("div");
      card.classList.add("room-card");

      // Build carousel for images
      const carousel = document.createElement("div");
      carousel.classList.add("carousel");

      // Add images to the carousel
      imagess.forEach((images, index) => {
        const img = document.createElement("img");
        img.src = images;
        img.alt = `${roomType} Room Image ${index + 1}`;
        img.classList.add("carousel-image");
        if (index === 0) img.style.display = "block"; // Show first image by default
        carousel.appendChild(img);
      });

      // Add carousel navigation buttons
      const prevButton = document.createElement("button");
      prevButton.innerHTML = "&#10094;"; // Left arrow
      prevButton.classList.add("carousel-button", "prev");
      prevButton.addEventListener("click", () => navigateCarousel(carousel, -1));

      const nextButton = document.createElement("button");
      nextButton.innerHTML = "&#10095;"; // Right arrow
      nextButton.classList.add("carousel-button", "next");
      nextButton.addEventListener("click", () => navigateCarousel(carousel, 1));

      carousel.appendChild(prevButton);
      carousel.appendChild(nextButton);

      // Build amenities list
      const amenitiesList = amenities.map((amenity) => {
        const icon = getAmenityIcon(amenity);
        return `
          <li>
            <img src="${icon}" alt="${amenity}" class="amenity-icon" />
            <span>${amenity}</span>
          </li>
        `;
      }).join("");

      card.innerHTML = `
        <h2>${roomType} Room</h2>
        <p>Price: $${price} / night</p>
        <p><strong>Amenities:</strong></p>
        <ul class="amenities-list">
          ${amenitiesList}
        </ul>
        <button>Book Now</button>
      `;

      // Insert carousel at the top of the card
      card.insertBefore(carousel, card.firstChild);

      // Book Now action
      const bookBtn = card.querySelector("button");
      bookBtn.addEventListener("click", () => {
        // Navigate to booking or pass roomType as a parameter
        window.location.href = "booking?roomType=" + roomType;
      });

      roomsContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);
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
  if (name.includes("room service")) return "images/icon_service.png";
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