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
  storageBucket: "hotel-booking-3aad3.firebaseapp.com",
  messagingSenderId: "385718256742",
  appId: "1:385718256742:web:03fc7761dbf7e7345ad9a7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", async () => {
  console.log("rooms.js loaded");

  // Global dictionary to cache amenity images
  let amenityImages = {};

  // ---------------------------
  // Preload Amenity Images
  // ---------------------------
  async function loadAmenityImages() {
    try {
      const amenitySnapshot = await getDocs(collection(db, "Amenity"));
      amenitySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.image) {
          // Check if the stored value already starts with "data:"; if not, prepend the prefix.
          const imageUrl = data.image.startsWith("data:")
            ? data.image
            : "data:image/png;base64," + data.image;
          // Store key in lower-case for consistency.
          amenityImages[docSnap.id.toLowerCase()] = imageUrl;
        }
      });
      console.log("Amenity images loaded:", amenityImages);
    } catch (error) {
      console.error("Error loading amenity images:", error);
    }
  }

  // Wait for amenity images to load before proceeding
  await loadAmenityImages();

  // ---------------------------
  // Handle Auth UI Logic
  // ---------------------------
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
      if (accountDropdown) accountDropdown.style.display = "inline-block";
      if (loginBtn)        loginBtn.style.display = "none";
    } else {
      if (accountDropdown) accountDropdown.style.display = "none";
      if (loginBtn)        loginBtn.style.display = "inline-block";
    }
  });

  // ---------------------------
  // FETCH & DISPLAY ROOM TYPES
  // ---------------------------
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

      // Build amenities list using the fetched amenity images
      const amenitiesList = typeData.amenities.map((amenity) => {
        const iconSrc = getAmenityIcon(amenity);
        return `
          <li>
            <img src="${iconSrc}" alt="${amenity}" class="amenity-icon" />
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
        window.location.href = `booking?roomType=${encodeURIComponent(roomType)}`;
      });

      roomsContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Error fetching room types:", error);
    roomsContainer.innerHTML = "<p>Failed to load rooms. Please try again later.</p>";
  }

  // ---------------------------
  // HELPER FUNCTIONS
  // ---------------------------
  // Updated getAmenityIcon to use lower-case keys and an absolute fallback URL.
  function getAmenityIcon(amenity) {
    const key = amenity.toLowerCase();
    if (amenityImages[key]) {
      return amenityImages[key];
    }
    return "/images/icon_amenity.png";
  }

  // Carousel navigation logic
  function navigateCarousel(carousel, direction) {
    const images = carousel.querySelectorAll(".carousel-image");
    let currentIndex = 0;
    images.forEach((img, index) => {
      if (img.style.display === "block") {
        currentIndex = index;
        img.style.display = "none";
      }
    });
    let nextIndex = currentIndex + direction;
    if (nextIndex >= images.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = images.length - 1;
    images[nextIndex].style.display = "block";
  }
});
